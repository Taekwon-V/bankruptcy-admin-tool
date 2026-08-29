import os
import json
from datetime import datetime, timedelta

def create_sample_case_structure():
    base_dir = os.path.abspath("사건저장소_샘플")
    os.makedirs(base_dir, exist_ok=True)
    
    # 4 months: 2025.11, 2025.12, 2026.01, 2026.02
    months_config = [
        ("2025년", "11월_배정사건", "2025-11"),
        ("2025년", "12월_배정사건", "2025-12"),
        ("2026년", "01월_배정사건", "2026-01"),
        ("2026년", "02월_배정사건", "2026-02"),
    ]
    
    # Sample names and realistic data
    sample_pool = [
        # Nov 2025
        [
            ("홍길동", "개인파산", "서울회생법원", "2025하면1101", "면책종결", 145000000),
            ("김영희", "개인파산", "서울회생법원", "2025하면1102", "환가배당진행", 230000000),
            ("이철수", "개인파산", "수원회생법원", "2025하면1103", "면책종결", 89000000),
            ("박민수", "개인파산", "인천지방법원", "2025하면1104", "면책종결", 170000000),
            ("최수진", "개인파산", "서울회생법원", "2025하면1105", "환가배당진행", 310000000),
            ("정대호", "개인파산", "수원회생법원", "2025하면1106", "면책종결", 95000000),
            ("강현우", "개인파산", "대전지방법원", "2025하면1107", "면책종결", 120000000),
            ("조은지", "개인파산", "서울회생법원", "2025하면1108", "환가배당진행", 185000000),
            ("(주)삼진유통", "법인파산", "서울회생법원", "2025하단1109", "환가배당진행", 1450000000),
            ("(주)대성텍", "법인파산", "수원회생법원", "2025하단1110", "환가배당진행", 890000000),
        ],
        # Dec 2025
        [
            ("윤서준", "개인파산", "서울회생법원", "2025하면1201", "채권자집회대기", 160000000),
            ("임도현", "개인파산", "수원회생법원", "2025하면1202", "채권자집회대기", 210000000),
            ("한지민", "개인파산", "서울회생법원", "2025하면1203", "환가배당진행", 420000000),
            ("오세훈", "개인파산", "인천지방법원", "2025하면1204", "채권자집회대기", 130000000),
            ("배정숙", "개인파산", "서울회생법원", "2025하면1205", "채권자집회대기", 98000000),
            ("신동엽", "개인파산", "대전지방법원", "2025하면1206", "환가배당진행", 270000000),
            ("안성민", "개인파산", "수원회생법원", "2025하면1207", "채권자집회대기", 155000000),
            ("유재석", "개인파산", "서울회생법원", "2025하면1208", "채권자집회대기", 180000000),
            ("(주)한결건설", "법인파산", "서울회생법원", "2025하단1209", "채권자집회대기", 2400000000),
            ("(주)태양솔루션", "법인파산", "인천지방법원", "2025하단1210", "환가배당진행", 1100000000),
        ],
        # Jan 2026
        [
            ("송중기", "개인파산", "서울회생법원", "2026하면0101", "통장분석중", 195000000),
            ("전지현", "개인파산", "수원회생법원", "2026하면0102", "서류보정중", 140000000),
            ("하정우", "개인파산", "서울회생법원", "2026하면0103", "통장분석중", 320000000),
            ("손석구", "개인파산", "인천지방법원", "2026하면0104", "채권자집회대기", 250000000),
            ("김태리", "개인파산", "서울회생법원", "2026하면0105", "통장분석중", 115000000),
            ("이병헌", "개인파산", "대전지방법원", "2026하면0106", "서류보정중", 480000000),
            ("마동석", "개인파산", "수원회생법원", "2026하면0107", "통장분석중", 290000000),
            ("박은빈", "개인파산", "서울회생법원", "2026하면0108", "서류보정중", 85000000),
            ("(주)미래소프트", "법인파산", "서울회생법원", "2026하단0109", "통장분석중", 1850000000),
            ("(주)성우정밀", "법인파산", "수원회생법원", "2026하단0110", "서류보정중", 950000000),
        ],
        # Feb 2026
        [
            ("이지은", "개인파산", "서울회생법원", "2026하면0201", "신규접수", 110000000),
            ("차은우", "개인파산", "서울회생법원", "2026하면0202", "서류보정중", 175000000),
            ("안효섭", "개인파산", "수원회생법원", "2026하면0203", "신규접수", 92000000),
            ("김지원", "개인파산", "인천지방법원", "2026하면0204", "서류보정중", 230000000),
            ("변우석", "개인파산", "서울회생법원", "2026하면0205", "신규접수", 145000000),
            ("김고은", "개인파산", "대전지방법원", "2026하면0206", "서류보정중", 190000000),
            ("남주혁", "개인파산", "수원회생법원", "2026하면0207", "신규접수", 130000000),
            ("한소희", "개인파산", "서울회생법원", "2026하면0208", "서류보정중", 310000000),
            ("(주)글로벌네트웍스", "법인파산", "서울회생법원", "2026하단0209", "신규접수", 3200000000),
            ("(주)원앤원푸드", "법인파산", "인천지방법원", "2026하단0210", "신규접수", 1400000000),
        ]
    ]

    total_created = 0

    for idx, (year, month_name, year_month) in enumerate(months_config):
        month_dir = os.path.join(base_dir, year, month_name)
        os.makedirs(month_dir, exist_ok=True)
        
        cases = sample_pool[idx]
        for name, case_type, court, case_no, status, debt_amount in cases:
            folder_name = f"[{case_no}]_{name}_{case_type[:2]}"
            case_path = os.path.join(month_dir, folder_name)
            os.makedirs(case_path, exist_ok=True)
            
            # Standard subfolders
            subfolders = [
                "01_기본서류",
                "02_금융내역",
                "03_보정소명자료",
                "04_보고서_산출물"
            ]
            for sub in subfolders:
                sub_path = os.path.join(case_path, sub)
                os.makedirs(sub_path, exist_ok=True)
                
            # Create sample files inside subfolders based on status
            if "01_기본서류" in subfolders:
                with open(os.path.join(case_path, "01_기본서류", "주민등록초본_등본.txt"), "w", encoding="utf-8") as f:
                    f.write(f"[샘플서류] {name} 주민등록초본 (정상 제출됨)\n발급일자: {year_month}-05")
                with open(os.path.join(case_path, "01_기본서류", "지방세세목별과세증명서.txt"), "w", encoding="utf-8") as f:
                    f.write(f"[샘플서류] {name} 지방세 과세증명서 (최근 5년치)\n")

            if status in ["통장분석중", "채권자집회대기", "환가배당진행", "면책종결"]:
                with open(os.path.join(case_path, "02_금융내역", "국민은행_거래내역_3년치.xlsx"), "w", encoding="utf-8") as f:
                    f.write("[샘플 엑셀 파일 Placeholder - 거래건수 1,240건]")
                with open(os.path.join(case_path, "02_금융내역", "신한은행_거래내역.xlsx"), "w", encoding="utf-8") as f:
                    f.write("[샘플 엑셀 파일 Placeholder - 거래건수 850건]")

            if status in ["채권자집회대기", "환가배당진행", "면책종결"]:
                with open(os.path.join(case_path, "04_보고서_산출물", "파산관제인_조사보고서_초안.hwpx"), "w", encoding="utf-8") as f:
                    f.write("[샘플 HWPX 조사보고서]")
                if case_type == "법인파산" or status == "환가배당진행":
                    with open(os.path.join(case_path, "04_보고서_산출물", "배당표_계산안.xlsx"), "w", encoding="utf-8") as f:
                        f.write("[샘플 엑셀 배당표]")

            # Metadata JSON file
            meta = {
                "case_number": case_no,
                "debtor_name": name,
                "case_type": case_type,
                "court": court,
                "status": status,
                "assigned_date": f"{year_month}-10",
                "meeting_date": (datetime.strptime(f"{year_month}-10", "%Y-%m-%d") + timedelta(days=60)).strftime("%Y-%m-%d"),
                "total_debt": debt_amount,
                "memo": f"{name} 채무자 파산 사건 ({status} 단계). 주요 검토 필요 사항 기록.",
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            with open(os.path.join(case_path, "사건메타정보.json"), "w", encoding="utf-8") as f:
                json.dump(meta, f, ensure_ascii=False, indent=2)

            total_created += 1

    print(f"Total {total_created} sample case folders created in {base_dir}")

if __name__ == "__main__":
    create_sample_case_structure()
