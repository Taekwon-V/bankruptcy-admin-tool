import os
import sys
import json
import shutil
import subprocess
import webview

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "app", "static")
INDEX_HTML = os.path.join(STATIC_DIR, "index.html")
STORAGE_ROOT = os.path.abspath(os.path.join(BASE_DIR, "사건저장소"))
SAMPLE_SOURCE = os.path.abspath(os.path.join(BASE_DIR, "사건저장소_샘플"))

# 사건저장소 폴더가 없으면 초기 자동 생성 (샘플 데이터가 있으면 안전하게 1회 복제 후 독립 운영)
if not os.path.exists(STORAGE_ROOT):
    if os.path.exists(SAMPLE_SOURCE):
        try:
            shutil.copytree(SAMPLE_SOURCE, STORAGE_ROOT)
        except Exception as copy_err:
            print(f"Initial storage init error: {copy_err}")
            os.makedirs(STORAGE_ROOT, exist_ok=True)
    else:
        os.makedirs(STORAGE_ROOT, exist_ok=True)

class DesktopAPI:
    """100% 로컬 네이티브 데스크톱 API (서버 없이 파이썬-GUI 직접 통신)"""

    def get_cases(self):
        """실제 하드디스크의 사건저장소 폴더를 실시간 직접 스캔하여 반환"""
        cases = []
        if os.path.exists(STORAGE_ROOT):
            for root, dirs, files in os.walk(STORAGE_ROOT):
                if "사건메타정보.json" in files:
                    meta_path = os.path.join(root, "사건메타정보.json")
                    try:
                        with open(meta_path, "r", encoding="utf-8") as f:
                            meta = json.load(f)
                            
                        if not meta or not isinstance(meta, dict):
                            continue
                            
                        # Status flags fallback for backward compatibility
                        status_val = meta.get("status", "신규접수")
                        if "interview_done" not in meta:
                            meta["interview_done"] = False if status_val in ["신규접수", "서류보정중"] else True
                        if "docs_completed" not in meta:
                            meta["docs_completed"] = False if status_val in ["신규접수", "서류보정중"] else True
                        if "report_submitted" not in meta:
                            meta["report_submitted"] = True if status_val in ["환가배당진행", "면책종결"] else False
                        
                        # Subfolder file scan
                        subfolders = {}
                        for sub in ["01_기본서류", "02_금융내역", "03_보정소명자료", "04_보고서_산출물"]:
                            sub_p = os.path.join(root, sub)
                            if os.path.exists(sub_p):
                                subfolders[sub] = os.listdir(sub_p)
                            else:
                                subfolders[sub] = []
                                
                        meta["folder_path"] = root
                        meta["subfolders"] = subfolders
                        
                        rel_path = os.path.relpath(root, STORAGE_ROOT)
                        parts = rel_path.split(os.sep)
                        if len(parts) >= 2:
                            meta["year"] = parts[0]
                            meta["month_category"] = parts[1]
                        else:
                            meta["year"] = "기타"
                            meta["month_category"] = "기타"
                            
                        cases.append(meta)
                    except Exception as e:
                        print(f"Error reading meta {meta_path}: {e}")
        return {"total": len(cases), "cases": cases}

    def update_case_flags(self, folder_path, flags):
        """대시보드 및 상세화면에서 상담완료/서류완비/보고서제출 상태 실시간 갱신"""
        try:
            if not folder_path or not os.path.exists(folder_path):
                return {"success": False, "error": "해당 사건 폴더를 찾을 수 없습니다."}
            meta_path = os.path.join(folder_path, "사건메타정보.json")
            meta = {}
            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
            
            for k, v in flags.items():
                meta[k] = v
                
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta, f, ensure_ascii=False, indent=2)
                
            return {"success": True, "meta": meta}
        except Exception as e:
            return {"success": False, "error": f"상태 저장 실패: {str(e)}"}

    def create_new_case(self, case_data):
        """신규 사건 등록: 년도/월 폴더 자동생성 및 4대 표준 서류 폴더 + 메타데이터 자동 구성"""
        try:
            os.makedirs(STORAGE_ROOT, exist_ok=True)
            
            year = str(case_data.get("year", "2026")).strip()
            if not year.endswith("년"):
                year += "년"
                
            month = str(case_data.get("month", "02")).strip().zfill(2)
            month_folder_name = f"{month}월_배정사건"
            
            case_number = case_data.get("case_number", "").strip()
            debtor_name = case_data.get("debtor_name", "").strip()
            
            if not case_number or not debtor_name:
                return {"success": False, "error": "사건번호와 채무자명(법인명)은 필수 입력 항목입니다."}
                
            # Target case directory
            case_folder_name = f"[{case_number}] {debtor_name}"
            target_dir = os.path.join(STORAGE_ROOT, year, month_folder_name, case_folder_name)
            
            if os.path.exists(target_dir):
                return {"success": False, "error": f"이미 동일한 사건 폴더가 존재합니다:\n{target_dir}"}
                
            # 1. Create directory tree (Auto-creates Year and Month folders if not existing)
            os.makedirs(target_dir, exist_ok=True)
            
            # 2. Create standard 4 subfolders
            standard_subs = ["01_기본서류", "02_금융내역", "03_보정소명자료", "04_보고서_산출물"]
            for sub in standard_subs:
                os.makedirs(os.path.join(target_dir, sub), exist_ok=True)
                
            # 3. Create 사건메타정보.json (신규 등록 시 상담필요=True(interview_done=False), 서류미완료=True)
            meta = {
                "case_number": case_number,
                "debtor_name": debtor_name,
                "case_type": case_data.get("case_type", "개인파산"),
                "court": case_data.get("court", "인천지방법원"),
                "status": case_data.get("status", "신규접수"),
                "assigned_date": case_data.get("assigned_date", f"{year.replace('년','')}-{month}-10"),
                "meeting_date": case_data.get("meeting_date", ""),
                "total_debt": int(case_data.get("total_debt", 0)),
                "phone": case_data.get("phone", "010-0000-0000"),
                "interview_done": False,
                "docs_completed": False,
                "report_submitted": False,
                "memo": case_data.get("memo", "신규 등록된 사건입니다. 1차 제출 서류 완비 여부 검토가 필요합니다.")
            }
            
            meta_file_path = os.path.join(target_dir, "사건메타정보.json")
            with open(meta_file_path, "w", encoding="utf-8") as f:
                json.dump(meta, f, ensure_ascii=False, indent=2)
                
            # Sample welcome note in 01_기본서류
            with open(os.path.join(target_dir, "01_기본서류", "00_사건_기본안내.txt"), "w", encoding="utf-8") as f:
                f.write(f"사건번호: {case_number}\n채무자명: {debtor_name}\n배정일자: {meta['assigned_date']}\n표준 폴더가 정상 생성되었습니다.")

            return {"success": True, "target_dir": target_dir, "case": meta}
        except Exception as e:
            return {"success": False, "error": f"사건 생성 실패: {str(e)}"}

    def move_case_date(self, case_number, debtor_name, old_folder_path, new_year, new_month):
        """사건의 배정 년도 및 월 변경: 실제 디스크 폴더를 안전하게 이동 (열린 파일 잠금 검사)"""
        try:
            os.makedirs(STORAGE_ROOT, exist_ok=True)
            
            new_year_str = str(new_year).strip()
            if not new_year_str.endswith("년"):
                new_year_str += "년"
                
            new_month_str = str(new_month).strip().zfill(2)
            new_month_folder = f"{new_month_str}월_배정사건"
            
            case_folder_name = f"[{case_number}] {debtor_name}"
            new_target_dir = os.path.join(STORAGE_ROOT, new_year_str, new_month_folder, case_folder_name)
            
            # If old_folder_path is not found at given path, search for current location on disk
            current_path = old_folder_path
            if not current_path or not os.path.exists(current_path):
                found_path = None
                if os.path.exists(STORAGE_ROOT):
                    for root, dirs, files in os.walk(STORAGE_ROOT):
                        if os.path.basename(root) == case_folder_name:
                            found_path = root
                            break
                if found_path:
                    current_path = found_path
                else:
                    return {"success": False, "error": f"사건 폴더를 찾을 수 없습니다:\n{case_folder_name}"}

            # If already at destination, succeed immediately
            if os.path.abspath(current_path) == os.path.abspath(new_target_dir):
                return {"success": True, "new_folder_path": new_target_dir, "message": "이미 해당 위치에 있습니다."}
                
            if os.path.exists(new_target_dir):
                return {"success": False, "error": f"이동할 대상 위치에 이미 동일한 이름의 폴더가 존재합니다:\n{new_target_dir}"}

            # 1. Check for file locks (PermissionError/SharingViolation in Word/HWP/Excel)
            for root, dirs, files in os.walk(current_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "r+b") as test_f:
                            pass
                    except PermissionError:
                        return {
                            "success": False,
                            "error": f"해당 사건의 서류({file})가 한글/엑셀/워드/PDF 등에서 열려 있습니다.\n열려 있는 파일을 모두 닫은 후 다시 시도해 주세요."
                        }
                    except OSError as e:
                        if getattr(e, 'winerror', None) in [32, 5]:
                            return {
                                "success": False,
                                "error": f"해당 사건의 서류({file})가 다른 프로그램에서 열려 있습니다.\n열려 있는 파일을 모두 닫은 후 다시 시도해 주세요."
                            }

            # 2. Ensure destination parent directory exists
            dest_parent_dir = os.path.join(STORAGE_ROOT, new_year_str, new_month_folder)
            os.makedirs(dest_parent_dir, exist_ok=True)
            
            # 3. Perform move
            shutil.move(current_path, new_target_dir)
            
            # 4. Update metadata inside
            meta_path = os.path.join(new_target_dir, "사건메타정보.json")
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    meta["year"] = new_year_str
                    meta["month_category"] = new_month_folder
                    with open(meta_path, "w", encoding="utf-8") as f:
                        json.dump(meta, f, ensure_ascii=False, indent=2)
                except Exception as meta_err:
                    print(f"Meta update warning: {meta_err}")

            return {"success": True, "new_folder_path": new_target_dir}
            
        except PermissionError:
            return {
                "success": False,
                "error": "해당 사건의 서류가 다른 프로그램에서 열려 있어 폴더를 이동할 수 없습니다.\n열려 있는 창을 모두 닫고 다시 시도해 주세요."
            }
        except OSError as oe:
            if getattr(oe, 'winerror', None) in [32, 5]:
                return {
                    "success": False,
                    "error": "해당 사건의 서류가 다른 프로그램에서 사용 중입니다.\n파일을 닫고 다시 시도해 주세요."
                }
            return {"success": False, "error": f"폴더 이동 중 시스템 오류 발생: {str(oe)}"}
        except Exception as e:
            return {"success": False, "error": f"폴더 이동 실패: {str(e)}"}

    def open_folder(self, folder_path):
        try:
            if folder_path and os.path.exists(folder_path):
                if sys.platform == 'win32':
                    os.startfile(folder_path)
                elif sys.platform == 'darwin':
                    subprocess.run(['open', folder_path])
                else:
                    subprocess.run(['xdg-open', folder_path])
                return {"success": True}
            return {"success": False, "error": "폴더가 존재하지 않습니다."}
        except Exception as e:
            return {"success": False, "error": str(e)}

def get_left_half_screen_geometry():
    """사용자 모니터의 실제 작업영역(작업표시줄 제외)을 감지하여 좌측 50% 분할 좌표 및 크기 계산"""
    try:
        if sys.platform == 'win32':
            import ctypes
            user32 = ctypes.windll.user32
            user32.SetProcessDPIAware()
            
            # SPI_GETWORKAREA = 48 (작업표시줄 제외 가용 영역)
            class RECT(ctypes.Structure):
                _fields_ = [('left', ctypes.c_long), ('top', ctypes.c_long), ('right', ctypes.c_long), ('bottom', ctypes.c_long)]
            rect = RECT()
            if user32.SystemParametersInfoW(48, 0, ctypes.byref(rect), 0):
                work_w = rect.right - rect.left
                work_h = rect.bottom - rect.top
                win_w = max(720, work_w // 2)
                win_h = max(600, work_h)
                win_x = rect.left
                win_y = rect.top
                return win_x, win_y, win_w, win_h
    except Exception as e:
        print(f"Screen geometry detection fallback: {e}")
        
    return 0, 0, 960, 1040

def main():
    api = DesktopAPI()
    win_x, win_y, win_w, win_h = get_left_half_screen_geometry()

    # Create native standalone Desktop Window (좌측 50% 기본 밀착 모드)
    window = webview.create_window(
        title='⚖️ 파산관제 스마트 매니저 (설치형 데스크톱 프로그램)',
        url=INDEX_HTML,
        x=win_x,
        y=win_y,
        width=win_w,
        height=win_h,
        min_size=(680, 600),
        resizable=True,
        text_select=True,
        js_api=api
    )
    
    # Start native GUI window (Edge Chromium WebView2 - No HTTP Server)
    webview.start(debug=False)

if __name__ == '__main__':
    main()
