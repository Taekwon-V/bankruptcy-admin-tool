import os
import json
import random
from datetime import datetime, timedelta

def generate_full_sample_database():
    base_dir = os.path.abspath("사건저장소")
    os.makedirs(base_dir, exist_ok=True)
    
    # 1. Update all past cases before 2026-06 or any closed case to "면책종결" with all flags completed
    if os.path.exists(base_dir):
        for root, dirs, files in os.walk(base_dir):
            # Clean up unwanted future months (09월 ~ 12월) if any
            for d in list(dirs):
                if any(m in d for m in ["09월", "10월", "11월_배정사건", "12월_배정사건"]) and "2026년" in root:
                    import shutil
                    shutil.rmtree(os.path.join(root, d), ignore_errors=True)
            
            if "사건메타정보.json" in files:
                meta_path = os.path.join(root, "사건메타정보.json")
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    
                    assigned = meta.get("assigned_date", "")
                    year = meta.get("year", "")
                    month = meta.get("month_category", "")
                    status = meta.get("status", "")
                    
                    is_old = False
                    if year and ("2025" in year or "2024" in year or "2023" in year):
                        is_old = True
                    elif "01월" in month or "02월" in month or "03월" in month or "04월" in month or "05월" in month:
                        is_old = True
                    elif assigned and assigned < "2026-06-01":
                        is_old = True
                    elif status == "면책종결":
                        is_old = True
                        
                    if is_old:
                        meta["status"] = "면책종결"
                        meta["interview_done"] = True
                        meta["docs_completed"] = True
                        meta["report_submitted"] = True
                        meta["memo"] = "법원 면책 허가 결정 확정 및 사건 종결 완료."
                        with open(meta_path, "w", encoding="utf-8") as f:
                            json.dump(meta, f, ensure_ascii=False, indent=2)
                except Exception as e:
                    print(f"Error updating old meta {meta_path}: {e}")

    # 2. Datasets for generating 2026 June, July, August (25 cases per month = 75 new cases)
    courts = ["서울회생법원", "인천지방법원", "수원회생법원", "대전지방법원", "부산회생법원", "대구지방법원", "광주지방법원"]
    
    korean_names = [
        # June pool
        "이지은", "박서준", "한지민", "정해인", "김태리", "이도현", "신세경", "남주혁", "임윤아", "송강",
        "서인국", "고아라", "유아인", "천우희", "배수지", "옥택연", "문채원", "안재현", "박신혜", "주원",
        "(주)세진로지스틱스", "(주)한양정밀", "(주)에코그린푸드", "(주)동아산업개발", "(주)넥스트텍",
        # July pool
        "손석구", "김고은", "변우석", "김지원", "차은우", "안효섭", "한소희", "최우식", "이성경", "강하늘",
        "조이현", "이준호", "박보영", "지창욱", "김세정", "위하준", "이세영", "김선호", "신민아", "이재욱",
        "(주)삼진시스템", "(주)유니온상사", "(주)미래이앤씨", "(주)골든파트너스", "(주)한빛인터내셔널",
        # August pool
        "김인철", "이순신", "강감찬", "유재석", "신동엽", "강호동", "하정우", "조인성", "송중기", "전지현",
        "이병헌", "마동석", "박은빈", "공유", "현빈", "손예진", "김수현", "원빈", "이나영", "정우성",
        "(주)대성글로벌", "(주)태양테크놀로지", "(주)현대통상", "(주)케이원미디어", "(주)서우디앤씨"
    ]

    months_plan = [
        # (Month name, Assigned date prefix, Meeting base date, Status distribution, Name slice)
        ("06월_배정사건", "2026-06", "2026-09", 0, 25, [
            ("면책종결", 6),
            ("환가배당진행", 5),
            ("채권자집회대기", 7),
            ("통장분석중", 5),
            ("서류보정중", 2),
        ]),
        ("07월_배정사건", "2026-07", "2026-09", 25, 50, [
            ("채권자집회대기", 8),
            ("통장분석중", 8),
            ("서류보정중", 6),
            ("신규접수", 3),
        ]),
        ("08월_배정사건", "2026-08", "2026-10", 50, 75, [
            ("신규접수", 10),
            ("서류보정중", 8),
            ("통장분석중", 5),
            ("채권자집회대기", 2),
        ])
    ]

    for month_folder, assign_prefix, meet_prefix, start_idx, end_idx, status_dist in months_plan:
        target_month_dir = os.path.join(base_dir, "2026년", month_folder)
        os.makedirs(target_month_dir, exist_ok=True)
        
        names = korean_names[start_idx:end_idx]
        
        # Flatten status list
        status_list = []
        for stat, cnt in status_dist:
            status_list.extend([stat] * cnt)
        
        month_num = month_folder[:2] # "06", "07", "08"
        
        for idx, name in enumerate(names):
            case_no_num = str(idx + 1).zfill(2)
            is_corp = name.startswith("(")
            case_type = "법인파산" if is_corp else "개인파산"
            case_prefix = "2026하단" if is_corp else "2026하면"
            case_no = f"{case_prefix}{month_num}{case_no_num}"
            
            status = status_list[idx] if idx < len(status_list) else "신규접수"
            court = courts[idx % len(courts)]
            
            # Debt amount (Individual: 5,000만원 ~ 8억원, Corporate: 8억원 ~ 45억원)
            if is_corp:
                debt = random.randint(8, 45) * 100000000 + random.randint(10, 90) * 1000000
            else:
                debt = random.randint(4, 55) * 10000000 + random.randint(100, 990) * 10000
                
            phone = f"010-{random.randint(2000, 9999)}-{random.randint(1000, 9999)}"
            assign_day = str(random.randint(5, 20)).zfill(2)
            assigned_date = f"{assign_prefix}-{assign_day}"
            
            # Meeting dates: create realistic D-Days relative to current date (2026-08-29)
            if status in ["채권자집회대기", "통장분석중", "환가배당진행"]:
                if month_num == "06":
                    meet_day = random.choice(["2026-09-01", "2026-09-04", "2026-09-08", "2026-09-12", "2026-09-15"])
                elif month_num == "07":
                    meet_day = random.choice(["2026-09-10", "2026-09-16", "2026-09-22", "2026-09-28", "2026-10-08"])
                else:
                    meet_day = random.choice(["2026-10-15", "2026-10-22", "2026-10-29", "2026-11-05"])
            else:
                meet_day = f"{meet_prefix}-20"
                
            # Status Flags
            if status == "신규접수":
                interview_done = False
                docs_completed = False
                report_submitted = False
                memo = "신규 배정 사건입니다. 채무자 1차 면담(상담) 및 필수 14종 서류 접수 검토가 필요합니다."
            elif status == "서류보정중":
                interview_done = random.choice([True, False])
                docs_completed = False
                report_submitted = False
                memo = "세목별 과세증명서 및 지적전산자료 미제출로 채무자에게 보정서 제출을 요구한 상태입니다."
            elif status == "통장분석중":
                interview_done = True
                docs_completed = True
                report_submitted = False
                memo = "필수 서류 완비 완료. 최근 3년치 은행 계좌 거래내역 편파변제 및 부인권 대상 거래 정밀 분석 중."
            elif status == "채권자집회대기":
                interview_done = True
                docs_completed = True
                report_submitted = random.choice([True, False])
                memo = "제1회 채권자집회 기일 대비 조사보고서 작성 완료 및 법원 전자소송 제출 대기 중."
            elif status == "환가배당진행":
                interview_done = True
                docs_completed = True
                report_submitted = True
                memo = "임차보증금 반환금 환가 완료. 조세채권 우선변제 후 일반 파산채권자 안분 배당표 작성 중."
            else: # 면책종결
                interview_done = True
                docs_completed = True
                report_submitted = True
                memo = "배당 완료 및 법원 면책 허가 결정 확정으로 사건 종결 처리됨."

            # Create Directory
            folder_name = f"[{case_no}] {name}"
            case_dir = os.path.join(target_month_dir, folder_name)
            os.makedirs(case_dir, exist_ok=True)
            
            # Create 4 standard subfolders
            for sub in ["01_기본서류", "02_금융내역", "03_보정소명자료", "04_보고서_산출물"]:
                os.makedirs(os.path.join(case_dir, sub), exist_ok=True)
                
            # Populate mock files inside subfolders based on status
            if docs_completed or status in ["서류보정중", "통장분석중", "채권자집회대기", "환가배당진행", "면책종결"]:
                with open(os.path.join(case_dir, "01_기본서류", f"{name}_주민등록등초본.pdf"), "w", encoding="utf-8") as f:
                    f.write(f"[표준 서류] {name} 주민초본")
                with open(os.path.join(case_dir, "01_기본서류", f"{name}_과세증명서_최근5년.pdf"), "w", encoding="utf-8") as f:
                    f.write(f"[표준 서류] {name} 세목별과세증명서")
                    
            if status in ["통장분석중", "채권자집회대기", "환가배당진행", "면책종결"]:
                with open(os.path.join(case_dir, "02_금융내역", f"{name}_국민은행_3년거래내역.xlsx"), "w", encoding="utf-8") as f:
                    f.write(f"[엑셀 거래내역] {name} 국민은행")
                with open(os.path.join(case_dir, "02_금융내역", f"{name}_신한은행_거래내역.xlsx"), "w", encoding="utf-8") as f:
                    f.write(f"[엑셀 거래내역] {name} 신한은행")
                    
            if status in ["채권자집회대기", "환가배당진행", "면책종결"]:
                with open(os.path.join(case_dir, "04_보고서_산출물", f"{name}_파산관제인_조사보고서.hwpx"), "w", encoding="utf-8") as f:
                    f.write(f"[한글 HWPX 보고서] {name} 조사보고서")
                    
            if status in ["환가배당진행", "면책종결"]:
                with open(os.path.join(case_dir, "04_보고서_산출물", f"{name}_배당표_최종안.xlsx"), "w", encoding="utf-8") as f:
                    f.write(f"[배당표] {name} 배당계산서")

            # Create 사건메타정보.json
            meta = {
                "case_number": case_no,
                "debtor_name": name,
                "case_type": case_type,
                "court": court,
                "status": status,
                "assigned_date": assigned_date,
                "meeting_date": meet_day,
                "total_debt": debt,
                "phone": phone,
                "interview_done": interview_done,
                "docs_completed": docs_completed,
                "report_submitted": report_submitted,
                "memo": memo,
                "created_at": f"{assigned_date} 09:00:00"
            }
            
            with open(os.path.join(case_dir, "사건메타정보.json"), "w", encoding="utf-8") as f:
                json.dump(meta, f, ensure_ascii=False, indent=2)

    print("[OK] Successfully updated all past cases to CLOSED & created 75 realistic cases in 사건저장소 (06, 07, 08월)!")

if __name__ == "__main__":
    generate_full_sample_database()
