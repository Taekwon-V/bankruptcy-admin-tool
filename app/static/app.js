/**
 * 파산관제 스마트 매니저 - Phase 2 종합 업무 상황판 & 3x3 사건 탐색기
 */

// 1. Korean Chosung Search Engine
const CHOSUNG_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

function getChosung(str) {
  if (!str) return '';
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 0xAC00;
    if (code >= 0 && code <= 11171) {
      result += CHOSUNG_LIST[Math.floor(code / (21 * 28))];
    } else {
      result += str.charAt(i);
    }
  }
  return result;
}

function isPureChosung(str) {
  return /^[\u3131-\u314E\s]+$/.test(str);
}

function matchSearch(text, query) {
  if (!query) return true;
  if (!text) return false;
  const cleanQuery = query.toLowerCase().replace(/\s+/g, '');
  const cleanText = text.toLowerCase().replace(/\s+/g, '');
  
  // 1. Exact/Substring text match
  if (cleanText.includes(cleanQuery)) return true;
  
  // 2. Initial consonant match ONLY when user query is pure chosung (e.g. 'ㄱㅇㅊ', 'ㅎㄱㄷ')
  if (isPureChosung(cleanQuery)) {
    const textChosung = getChosung(cleanText);
    if (textChosung.includes(cleanQuery)) {
      return true;
    }
  }
  return false;
}

// 1-1. Korean Phone Formatter (000-0000-0000)
function formatKoreanPhoneNumber(value) {
  if (!value) return '';
  const raw = value.replace(/[^0-9]/g, '');
  if (raw.startsWith('02')) {
    if (raw.length <= 2) return raw;
    if (raw.length <= 5) return `${raw.slice(0, 2)}-${raw.slice(2)}`;
    if (raw.length <= 9) return `${raw.slice(0, 2)}-${raw.slice(2, 5)}-${raw.slice(5)}`;
    return `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6, 10)}`;
  } else {
    if (raw.length <= 3) return raw;
    if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
    if (raw.length <= 10) return `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6)}`;
    return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
  }
}

// 1-2. Korean Currency Formatter (단일 직관적 표기: 1억 2,345만 6,789원)
function formatKoreanFullAmount(amount) {
  if (!amount || isNaN(amount) || amount <= 0) {
    return { formattedWon: '0원', shortKorean: '0원' };
  }
  const num = Math.floor(amount);
  const units = ['', '만', '억', '조', '경'];
  
  let n = num;
  let shortParts = [];
  let uIdx = 0;
  while (n > 0) {
    const rem = n % 10000;
    if (rem > 0) {
      shortParts.unshift(`${rem.toLocaleString('ko-KR')}${units[uIdx]}`);
    }
    n = Math.floor(n / 10000);
    uIdx++;
  }
  const shortKorean = (shortParts.length > 0 ? shortParts.join(' ') : '0') + '원';

  return {
    formattedWon: `${num.toLocaleString('ko-KR')}원`,
    shortKorean: shortKorean
  };
}

// 2. Standard 6 Pipeline Status Definition
const PIPELINE_STATUSES = [
  '신규접수',
  '서류보정중',
  '통장분석중',
  '채권자집회대기',
  '환가배당진행',
  '면책종결'
];

function matchStatus(status, filterKey) {
  if (!filterKey || filterKey === 'ALL') return true;
  if (filterKey === 'NEW') return status === '신규접수';
  if (filterKey === 'DOC_CORRECTION') return status === '서류보정중';
  if (filterKey === 'BANK_ANALYSIS') return status === '통장분석중';
  if (filterKey === 'MEETING') return status === '채권자집회대기';
  if (filterKey === 'DIVIDEND') return status === '환가배당진행';
  if (filterKey === 'CLOSED') return status === '면책종결';
  return true;
}

const STATUS_CONFIG = {
  '신규접수': { color: '#0284c7', bg: '#e0f2fe', label: '신규 접수' },
  '서류보정중': { color: '#b45309', bg: '#fef3c7', label: '서류 보정' },
  '통장분석중': { color: '#6d28d9', bg: '#ede9fe', label: '통장 분석' },
  '채권자집회대기': { color: '#be123c', bg: '#ffe4e6', label: '집회·보고' },
  '환가배당진행': { color: '#047857', bg: '#d1fae5', label: '환가·배당' },
  '면책종결': { color: '#475569', bg: '#f1f5f9', label: '면책·종결' }
};

// 2-1. Direct Category Case Filter Helper (Strictly ONLY active non-closed cases on Dashboard)
function getDirectCategoryCases(catKey) {
  const all = state.allCases || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // All dashboard categories strictly consider ONLY active (non-closed) cases
  const activeCases = all.filter(c => c && c.status !== '면책종결');

  if (catKey === 'ACTIVE') {
    return activeCases;
  } else if (catKey === 'INTERVIEW') {
    return activeCases.filter(c => !c.interview_done);
  } else if (catKey === 'DOCS') {
    return activeCases.filter(c => !c.docs_completed);
  } else if (catKey === 'DEADLINE') {
    return activeCases.filter(c => {
      if (!c.meeting_date) return false;
      const mDate = new Date(c.meeting_date);
      mDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((mDate - today) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 14;
    });
  } else if (catKey === 'REPORTS') {
    return activeCases.filter(c => c.report_submitted);
  }
  return activeCases;
}

// 3. Application State
const state = {
  activeView: 'dashboard', // 'dashboard' | 'workspace'
  allCases: [],
  selectedCase: null,
  navPath: [], // [] = Root/Years, ['2026년'] = Months, ['2026년', '02월_배정사건'] = Cases
  activeFilter: 'ALL',
  directCategory: null, // 'ACTIVE' | 'INTERVIEW' | 'DOCS' | 'DEADLINE' | 'REPORTS' | null
  searchQuery: '',
  selectedIndex: 0,
  calendarWeekOffset: 0, // 0 = Current week, -1 = Prev week, +1 = Next week
  modalVisibleItems: [],
  caseToMove: null
};

// 4. Initialization
window.addEventListener('pywebviewready', () => {
  initApp();
});

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  initEventListeners();
  loadCases();
}

// Load Cases from Python Native API (Direct local folder scan)
async function loadCases(preserveSelection = true) {
  try {
    let data;
    if (window.pywebview && window.pywebview.api) {
      data = await window.pywebview.api.get_cases();
    } else {
      setTimeout(async () => {
        if (window.pywebview && window.pywebview.api) {
          data = await window.pywebview.api.get_cases();
          processLoadedCases(data, preserveSelection);
        }
      }, 250);
      return;
    }
    processLoadedCases(data, preserveSelection);
  } catch (err) {
    console.error('Failed to load cases:', err);
    showToast('사건 데이터를 불러오는 중 오류가 발생했습니다.');
  }
}

function processLoadedCases(data, preserveSelection = true) {
  state.allCases = ((data && data.cases) || []).filter(c => c && typeof c === 'object');
  
  if (state.allCases.length > 0) {
    if (!preserveSelection || !state.selectedCase) {
      const febCase = state.allCases.find(c => c?.case_number === '2026하면0201') || state.allCases[0];
      selectCase(febCase, false); // Don't auto-switch view on init
    } else {
      const curNo = state.selectedCase?.case_number;
      const current = curNo ? state.allCases.find(c => c?.case_number === curNo) : null;
      if (current) selectCase(current, false);
    }
  }
  
  updateStatusFilterCounts();
  renderDashboard();
  renderExplorer();
}

// Switch between Dashboard and Workspace Views
function switchView(viewName) {
  state.activeView = viewName;
  const dashView = document.getElementById('dashboardView');
  const workView = document.getElementById('workspaceView');
  const navDashBtn = document.getElementById('navDashboardBtn');
  const headerCaseBadge = document.getElementById('headerCaseBadge');

  if (viewName === 'dashboard') {
    if (dashView) dashView.style.display = 'flex';
    if (workView) workView.style.display = 'none';
    if (navDashBtn) navDashBtn.classList.add('active');
    if (headerCaseBadge) headerCaseBadge.style.opacity = '0.85';
    renderDashboard();
  } else {
    if (dashView) dashView.style.display = 'none';
    if (workView) workView.style.display = 'block';
    if (navDashBtn) navDashBtn.classList.remove('active');
    if (headerCaseBadge) headerCaseBadge.style.opacity = '1';
  }
}

// 5. 🔥 RENDER PHASE 2 DASHBOARD (메인 종합 업무 상황판) 🔥
function renderDashboard() {
  // 1. Format today date in Korean
  const today = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dayName = days[today.getDay()];
  const dateStr = `${yyyy}년 ${mm}월 ${dd}일 (${dayName})`;
  const dateEl = document.getElementById('dashTodayDateDisplay');
  if (dateEl) dateEl.textContent = dateStr;

  // 2. Metrics Calculation via Helper
  const activeCases = getDirectCategoryCases('ACTIVE');
  const pendingInterviews = getDirectCategoryCases('INTERVIEW');
  const incompleteDocs = getDirectCategoryCases('DOCS');
  const deadlineCases = getDirectCategoryCases('DEADLINE');
  const reportCases = getDirectCategoryCases('REPORTS');

  // 3. Update 5 KPI Card Numbers
  const elActive = document.getElementById('kpiActiveCount');
  if (elActive) elActive.textContent = activeCases.length;

  const elInterview = document.getElementById('kpiInterviewCount');
  if (elInterview) elInterview.textContent = pendingInterviews.length;

  const elDocs = document.getElementById('kpiDocsCount');
  if (elDocs) elDocs.textContent = incompleteDocs.length;

  const elDeadline = document.getElementById('kpiDeadlineCount');
  if (elDeadline) elDeadline.textContent = deadlineCases.length;

  const elReport = document.getElementById('kpiReportCount');
  if (elReport) elReport.textContent = reportCases.length;

  // 4. Render Two-Week Weekday Calendar (월~금 2주간 기일 및 일정 달력)
  renderWeeklyCalendar();
}

// 5-0. Standard Consultation Hours (1-hour discrete slots: 10:00 ~ 17:00)
const CONSULTATION_HOURS = ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function getBookedInterviewTimes(dateStr, excludeCaseNo = null) {
  return (state.allCases || [])
    .filter(c => c && c.case_number !== excludeCaseNo && c.status !== '면책종결' && !c.interview_done)
    .filter(c => ((c.interview_date || c.assigned_date) === dateStr) && c.interview_time)
    .map(c => c.interview_time);
}

function getAvailableInterviewSlots(dateStr, excludeCaseNo = null) {
  const booked = getBookedInterviewTimes(dateStr, excludeCaseNo);
  return CONSULTATION_HOURS.filter(h => !booked.includes(h));
}

// 5-1. Render Two-Week Weekday Calendar (월~금 2주치 드래그 & 드롭 일정표)
function renderWeeklyCalendar() {
  const container = document.getElementById('twoWeekCalendarContainer');
  const titleEl = document.getElementById('calWeekRangeTitle');
  if (!container) return;

  container.innerHTML = '';

  // Calculate Monday of Week 1 (Moves by 1 week per shift, displaying 2 consecutive weeks)
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dayOfWeek = now.getDay();
  // If Sunday(0), offset back to Monday of the week
  const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const startMonday = new Date(now);
  startMonday.setDate(now.getDate() + diffToMon + (state.calendarWeekOffset * 7));

  const weekdays = ['월', '화', '수', '목', '금'];
  
  // Build Week 1 (5 days) and Week 2 (5 days)
  const weeks = [
    { label: '1주차', dates: [] },
    { label: '2주차', dates: [] }
  ];

  for (let w = 0; w < 2; w++) {
    for (let d = 0; d < 5; d++) {
      const dateObj = new Date(startMonday);
      dateObj.setDate(startMonday.getDate() + (w * 7) + d);
      weeks[w].dates.push(dateObj);
    }
  }

  // Format Range Title: e.g. "2026년 08월 31일 (월) ~ 09월 11일 (금)"
  const firstDayStr = formatDateKorean(weeks[0].dates[0]);
  const lastDayStr = formatDateKorean(weeks[1].dates[4]);
  if (titleEl) titleEl.textContent = `${firstDayStr} (월) ~ ${lastDayStr} (금)`;

  // Today & Tomorrow strings for visual comparison
  const todayStr = toDateISO(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = toDateISO(tomorrow);

  // Active cases only (strictly exclude closed cases)
  const activeCases = state.allCases.filter(c => c && c.status !== '면책종결');

  // Render both weeks
  weeks.forEach((weekObj, wIdx) => {
    const weekBlock = document.createElement('div');
    weekBlock.className = 'calendar-week-block';

    const wStart = `${weekObj.dates[0].getMonth() + 1}/${weekObj.dates[0].getDate()}`;
    const wEnd = `${weekObj.dates[4].getMonth() + 1}/${weekObj.dates[4].getDate()}`;
    
    weekBlock.innerHTML = `
      <div class="calendar-week-header">
        <span class="week-badge-pill">${wIdx + 1}주차</span>
        <span>${wStart} (월) ~ ${wEnd} (금)</span>
      </div>
      <div class="weekday-columns-grid"></div>
    `;

    const grid = weekBlock.querySelector('.weekday-columns-grid');

    weekObj.dates.forEach((dateObj, dIdx) => {
      const dateISO = toDateISO(dateObj);
      const isToday = (dateISO === todayStr);
      const isTomorrow = (dateISO === tomorrowStr);

      const events = [];

      activeCases.forEach(c => {
        const iDate = c.interview_date || c.assigned_date;
        if (c.meeting_date === dateISO) {
          if (c.report_submitted) {
            events.push({
              type: 'REPORT',
              typeLabel: '보고서',
              badgeClass: 'report',
              field: 'meeting_date',
              caseItem: c
            });
          } else {
            events.push({
              type: 'MEETING',
              typeLabel: '기일',
              badgeClass: 'meeting',
              field: 'meeting_date',
              caseItem: c
            });
          }
        } else if (iDate === dateISO && !c.interview_done) {
          events.push({
            type: 'INTERVIEW',
            typeLabel: '상담',
            badgeClass: 'interview',
            time: c.interview_time || '10:00',
            field: 'assigned_date',
            caseItem: c
          });
        } else if (c.assigned_date === dateISO && c.interview_done && !c.docs_completed) {
          events.push({
            type: 'DOCS',
            typeLabel: '서류',
            badgeClass: 'docs',
            field: 'assigned_date',
            caseItem: c
          });
        }
      });

      // Sort events: chronologically (Interviews by time first, then others)
      events.sort((a, b) => {
        if (a.type === 'INTERVIEW' && b.type === 'INTERVIEW') {
          return (a.time || '').localeCompare(b.time || '');
        }
        if (a.type === 'INTERVIEW') return -1;
        if (b.type === 'INTERVIEW') return 1;
        return 0;
      });

      const col = document.createElement('div');
      col.className = 'weekday-col' + (isToday ? ' is-today' : '') + (isTomorrow ? ' is-tomorrow' : '');
      col.setAttribute('data-date', dateISO);

      // Drag & Drop Dropzone Listeners
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });

      col.addEventListener('drop', (e) => handleEventDrop(e, dateISO));

      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const dayName = weekdays[dIdx];

      col.innerHTML = `
        <div class="weekday-col-header">
          <div class="col-header-left">
            <span class="day-name-pill">${dayName}${isToday ? ' (오늘)' : isTomorrow ? ' (내일)' : ''}</span>
            <span class="day-date-str">${mm}/${dd}</span>
          </div>
          <span class="day-event-count">${events.length}건</span>
        </div>
        <div class="weekday-col-body">
          ${events.length === 0 ? '<div class="empty-cal-day">일정 없음</div>' : ''}
        </div>
      `;

      const body = col.querySelector('.weekday-col-body');

      // Render Compact Drag-and-Drop Event Chips (With Right Time Badge on Interview)
      events.forEach(ev => {
        const chip = document.createElement('div');
        chip.className = 'cal-event-chip';
        chip.setAttribute('draggable', 'true');
        chip.title = `[드래그로 날짜 변경 가능] 클릭 시 사건 상세 보기`;

        const timeTag = ev.time ? `<span class="cal-event-time">${ev.time}</span>` : '';

        chip.innerHTML = `
          <span class="cal-event-badge ${ev.badgeClass}">${ev.typeLabel}</span>
          <span class="cal-event-case-no">${ev.caseItem.case_number || '-'}</span>
          <span class="cal-event-debtor">${ev.caseItem.debtor_name || '-'}</span>
          ${timeTag}
        `;

        // Drag Start
        chip.addEventListener('dragstart', (e) => {
          chip.classList.add('is-dragging');
          const dragData = {
            caseNumber: ev.caseItem.case_number,
            debtorName: ev.caseItem.debtor_name,
            eventType: ev.type,
            eventTypeLabel: ev.typeLabel, // "기일", "상담", "서류", "보고서"
            fromTime: ev.time || '',
            fromDate: dateISO,
            folderPath: ev.caseItem.folder_path
          };
          e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        });

        // Drag End
        chip.addEventListener('dragend', () => {
          chip.classList.remove('is-dragging');
        });

        // Click to open workspace
        chip.addEventListener('click', (e) => {
          selectCase(ev.caseItem, true);
        });

        body.appendChild(chip);
      });

      grid.appendChild(col);
    });

    container.appendChild(weekBlock);
  });
}

// 5-2. Handle Drag and Drop Case Date Movement with Collision Prevention & Confirmation
async function handleEventDrop(e, targetDate) {
  e.preventDefault();
  const col = e.currentTarget;
  if (col) col.classList.remove('drag-over');

  try {
    const rawData = e.dataTransfer.getData('text/plain');
    if (!rawData) return;
    const data = JSON.parse(rawData);
    const { caseNumber, debtorName, eventType, eventTypeLabel, fromDate, fromTime, folderPath } = data;

    if (!caseNumber || !targetDate || targetDate === fromDate) return;

    // Find case in state
    const caseItem = state.allCases.find(c => c && c.case_number === caseNumber);
    if (!caseItem) return;

    const flagData = {};

    if (eventType === 'INTERVIEW') {
      // Collision Prevention Check for 1-hour consultation slots
      const availableSlots = getAvailableInterviewSlots(targetDate, caseNumber);
      if (availableSlots.length === 0) {
        alert(`⚠️ [상담 예약 불가]\n\n해당 일자(${targetDate})는 1시간 단위 상담 시간(10:00~17:00)이 모두 예약되었습니다.\n다른 날짜를 선택해주세요.`);
        return;
      }

      // Preserve current time if available on target date, else assign first available open slot
      let targetTime = fromTime;
      if (!availableSlots.includes(targetTime)) {
        targetTime = availableSlots[0];
      }

      const confirmMsg = `[${debtorName}] 사건의 [상담] 일시를\n${fromDate} (${fromTime || '10:00'}) ➔ ${targetDate} ${targetTime} (으)로 변경하시겠습니까?`;
      if (!confirm(confirmMsg)) return;

      flagData.assigned_date = targetDate;
      flagData.interview_date = targetDate;
      flagData.interview_time = targetTime;

      await updateCaseFlag(
        caseItem,
        flagData,
        `[${debtorName}] 상담 일시가 ${targetDate} ${targetTime}(으)로 성공적으로 변경되었습니다.`
      );
    } else {
      const confirmMsg = `[${debtorName}] 사건의 [${eventTypeLabel}] 날짜를\n${fromDate} ➔ ${targetDate} (으)로 변경하시겠습니까?`;
      if (!confirm(confirmMsg)) return;

      if (eventType === 'MEETING' || eventType === 'REPORT') {
        flagData.meeting_date = targetDate;
      } else {
        flagData.assigned_date = targetDate;
      }

      await updateCaseFlag(
        caseItem,
        flagData,
        `[${debtorName}] [${eventTypeLabel}] 날짜가 ${targetDate}(으)로 성공적으로 변경되었습니다.`
      );
    }
  } catch (err) {
    console.error('Drop handling error:', err);
  }
}

function toDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateKorean(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}년 ${m}월 ${day}일`;
}

// Update Case Status Flags (interview_done, docs_completed, report_submitted)
async function updateCaseFlag(caseItem, flagData, successMsg) {
  if (!caseItem || !caseItem.folder_path) return;
  try {
    if (window.pywebview && window.pywebview.api) {
      const res = await window.pywebview.api.update_case_flags(caseItem.folder_path, flagData);
      if (res.success) {
        // Update local memory state
        Object.assign(caseItem, flagData);
        if (state.selectedCase && state.selectedCase.case_number === caseItem.case_number) {
          Object.assign(state.selectedCase, flagData);
          syncWorkspaceFlags(state.selectedCase);
        }
        renderDashboard();
        showToast(successMsg || '상태가 업데이트되었습니다.');
      } else {
        showToast(`업데이트 실패: ${res.error}`);
      }
    }
  } catch (err) {
    console.error('Flag update error:', err);
  }
}

// Synchronize Workspace Checkboxes with Selected Case State
function syncWorkspaceFlags(caseItem) {
  if (!caseItem) return;
  const chkInterview = document.getElementById('flagInterviewDone');
  const chkDocs = document.getElementById('flagDocsCompleted');
  const chkReport = document.getElementById('flagReportSubmitted');
  const selStatus = document.getElementById('caseQuickStatusSelect');

  if (chkInterview) chkInterview.checked = !!caseItem.interview_done;
  if (chkDocs) chkDocs.checked = !!caseItem.docs_completed;
  if (chkReport) chkReport.checked = !!caseItem.report_submitted;
  if (selStatus) selStatus.value = caseItem.status || '신규접수';
}

// 6. Select and Render Case in Workspace
function selectCase(caseItem, switchToWorkspace = true) {
  if (!caseItem) return;
  state.selectedCase = caseItem;

  // Header Bar
  const hType = document.getElementById('headerCaseType');
  if (hType) hType.textContent = caseItem.case_type === '법인파산' ? '법인' : '개인';
  const hNo = document.getElementById('headerCaseNo');
  if (hNo) hNo.textContent = caseItem.case_number || '-';
  const hDebtor = document.getElementById('headerDebtorName');
  if (hDebtor) hDebtor.textContent = caseItem.debtor_name || '-';

  // Hero Card
  const heroType = document.getElementById('heroCaseType');
  if (heroType) heroType.textContent = caseItem.case_type || '개인파산';
  
  const heroBadge = document.getElementById('heroStatusBadge');
  if (heroBadge) {
    heroBadge.textContent = caseItem.status || '신규접수';
    const cfg = STATUS_CONFIG[caseItem.status] || { color: '#0284c7', bg: '#e0f2fe' };
    heroBadge.style.backgroundColor = cfg.bg;
    heroBadge.style.color = cfg.color;
  }

  const heroTitle = document.getElementById('heroCaseTitle');
  if (heroTitle) heroTitle.textContent = caseItem.case_number || '-';
  const heroDebtor = document.getElementById('heroDebtorName');
  if (heroDebtor) heroDebtor.textContent = caseItem.debtor_name || '-';

  const metaCourt = document.getElementById('metaCourt');
  if (metaCourt) metaCourt.textContent = caseItem.court || '-';
  
  const metaPhone = document.getElementById('metaPhone');
  if (metaPhone) metaPhone.textContent = formatKoreanPhoneNumber(caseItem.phone || '010-0000-0000');
  
  const debtAmt = formatKoreanFullAmount(caseItem.total_debt || 0);
  const metaDebt = document.getElementById('metaDebtAmount');
  if (metaDebt) metaDebt.textContent = debtAmt.shortKorean;

  const metaMeeting = document.getElementById('metaMeetingDate');
  if (metaMeeting) {
    if (caseItem.meeting_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const meetingDate = new Date(caseItem.meeting_date);
      meetingDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((meetingDate - today) / (1000 * 60 * 60 * 24));
      const ddayStr = diffDays >= 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
      metaMeeting.textContent = `${caseItem.meeting_date} (${ddayStr})`;
    } else {
      metaMeeting.textContent = '기일 미정';
    }
  }

  const metaInterview = document.getElementById('metaInterviewSchedule');
  if (metaInterview) {
    const iDate = caseItem.interview_date || caseItem.assigned_date || '일정 미정';
    const iTime = caseItem.interview_time || '10:00';
    if (caseItem.interview_done) {
      metaInterview.textContent = `${iDate} ${iTime} (상담완료)`;
    } else {
      metaInterview.textContent = `${iDate} ${iTime} (예약됨)`;
    }
  }

  const metaMemo = document.getElementById('metaMemoText');
  if (metaMemo) metaMemo.textContent = caseItem.memo || '기록된 메모가 없습니다.';

  updatePipelineStepper(caseItem.status);
  syncWorkspaceFlags(caseItem);
  updateSubfolderFiles(caseItem.subfolders || {});

  if (switchToWorkspace) {
    switchView('workspace');
  }
}

function updatePipelineStepper(currentStatus) {
  const steps = document.querySelectorAll('#pipelineStepper .stepper-step');
  const tracks = document.querySelectorAll('#pipelineStepper .stepper-track');
  const targetIdx = PIPELINE_STATUSES.indexOf(currentStatus);

  steps.forEach((step, idx) => {
    step.classList.remove('completed', 'current');
    if (targetIdx !== -1) {
      if (idx < targetIdx) {
        step.classList.add('completed');
      } else if (idx === targetIdx) {
        step.classList.add('current');
      }
    }
  });

  tracks.forEach((track, idx) => {
    track.classList.remove('completed');
    if (targetIdx !== -1 && idx < targetIdx) {
      track.classList.add('completed');
    }
  });
}

function updateSubfolderFiles(subfolders) {
  const map = {
    '01_기본서류': { countEl: 'count01', listEl: 'fileList01' },
    '02_금융내역': { countEl: 'count02', listEl: 'fileList02' },
    '03_보정소명자료': { countEl: 'count03', listEl: 'fileList03' },
    '04_보고서_산출물': { countEl: 'count04', listEl: 'fileList04' }
  };

  for (const [folderKey, elements] of Object.entries(map)) {
    const files = subfolders[folderKey] || [];
    const countEl = document.getElementById(elements.countEl);
    const listEl = document.getElementById(elements.listEl);

    if (countEl) countEl.textContent = `${files.length}건`;
    if (listEl) {
      if (files.length === 0) {
        listEl.innerHTML = '<li class="empty-hint">파일이 없습니다</li>';
      } else {
        listEl.innerHTML = files.map(fileName => {
          let icon = '📄';
          if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) icon = '📊';
          else if (fileName.endsWith('.hwpx') || fileName.endsWith('.hwp') || fileName.endsWith('.docx')) icon = '📝';
          else if (fileName.endsWith('.pdf')) icon = '📕';
          return `<li><span class="file-icon">${icon}</span><span class="file-name" title="${fileName}">${fileName}</span></li>`;
        }).join('');
      }
    }
  }
}

// 7. Update Top Pill Bar Text in Explorer
function updateStatusFilterCounts() {
  let scopeCases = state.allCases;
  
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim();
    scopeCases = state.allCases.filter(c => 
      c && (
        matchSearch(c.case_number, q) ||
        matchSearch(c.debtor_name, q) ||
        matchSearch(c.court, q) ||
        matchSearch(c.status, q) ||
        matchSearch(c.memo, q)
      )
    );
  } else if (state.directCategory) {
    scopeCases = getDirectCategoryCases(state.directCategory);
  } else if (state.navPath.length === 2) {
    const [selYear, selMonth] = state.navPath;
    scopeCases = state.allCases.filter(c => c && c.year === selYear && c.month_category === selMonth);
  } else if (state.navPath.length === 1) {
    const selYear = state.navPath[0];
    scopeCases = state.allCases.filter(c => c && c.year === selYear);
  }

  const counts = {
    ALL: scopeCases.length,
    NEW: scopeCases.filter(c => c.status === '신규접수').length,
    DOC_CORRECTION: scopeCases.filter(c => c.status === '서류보정중').length,
    BANK_ANALYSIS: scopeCases.filter(c => c.status === '통장분석중').length,
    MEETING: scopeCases.filter(c => c.status === '채권자집회대기').length,
    DIVIDEND: scopeCases.filter(c => c.status === '환가배당진행').length,
    CLOSED: scopeCases.filter(c => c.status === '면책종결').length
  };

  const pillAll = document.getElementById('pill-all');
  if (pillAll) pillAll.textContent = `전체 : ${counts.ALL} 건`;
  const pillNew = document.getElementById('pill-new');
  if (pillNew) pillNew.textContent = `신규 접수 : ${counts.NEW} 건`;
  const pillDoc = document.getElementById('pill-doc');
  if (pillDoc) pillDoc.textContent = `서류 보정 : ${counts.DOC_CORRECTION} 건`;
  const pillBank = document.getElementById('pill-bank');
  if (pillBank) pillBank.textContent = `통장 분석 : ${counts.BANK_ANALYSIS} 건`;
  const pillMeet = document.getElementById('pill-meet');
  if (pillMeet) pillMeet.textContent = `집회·보고 : ${counts.MEETING} 건`;
  const pillDiv = document.getElementById('pill-dividend');
  if (pillDiv) pillDiv.textContent = `환가·배당 : ${counts.DIVIDEND} 건`;
  const pillClosed = document.getElementById('pill-closed');
  if (pillClosed) pillClosed.textContent = `면책·종결 : ${counts.CLOSED} 건`;
}

// 8. Render 3x3 Explorer Modal Content
function renderExplorer() {
  const container = document.getElementById('explorerContentArea');
  if (!container) return;
  container.innerHTML = '';
  state.modalVisibleItems = [];

  renderBreadcrumbs();
  updateStatusFilterCounts();

  if (state.searchQuery.trim()) {
    renderSearchResults(container);
    return;
  }

  if (state.directCategory) {
    renderDirectCategoryCaseCards(container);
    return;
  }

  const level = state.navPath.length;
  if (level === 0) {
    renderYearCards(container);
  } else if (level === 1) {
    renderMonthCards(container);
  } else {
    renderCaseCards(container);
  }
}

function renderBreadcrumbs() {
  const list = document.getElementById('breadcrumbsList');
  const btnUp = document.getElementById('btnUpLevel');
  if (!list) return;

  list.innerHTML = '';
  const rootCrumb = document.createElement('span');
  rootCrumb.className = 'nav-crumb' + (state.navPath.length === 0 && !state.searchQuery && !state.directCategory ? ' active' : '');
  rootCrumb.textContent = '📁 사건저장소';
  rootCrumb.addEventListener('click', () => {
    state.navPath = [];
    state.searchQuery = '';
    state.directCategory = null;
    state.activeFilter = 'ALL';
    const input = document.getElementById('explorerSearchInput');
    if (input) input.value = '';
    state.selectedIndex = 0;
    renderExplorer();
  });
  list.appendChild(rootCrumb);

  if (state.searchQuery.trim()) {
    const arrow = document.createElement('span');
    arrow.className = 'nav-arrow';
    arrow.textContent = '›';
    list.appendChild(arrow);

    const searchCrumb = document.createElement('span');
    searchCrumb.className = 'nav-crumb active';
    searchCrumb.textContent = `🔍 검색: "${state.searchQuery}"`;
    list.appendChild(searchCrumb);

    if (btnUp) btnUp.style.display = 'inline-flex';
    return;
  }

  if (state.directCategory) {
    const catTitles = {
      ACTIVE: '진행 사건',
      INTERVIEW: '상담 필요 사건',
      DOCS: '서류 보정 사건',
      DEADLINE: '기일 임박 사건 (D-14)',
      REPORTS: '보고서 제출 완료 사건'
    };
    const arrow = document.createElement('span');
    arrow.className = 'nav-arrow';
    arrow.textContent = '›';
    list.appendChild(arrow);

    const catCrumb = document.createElement('span');
    catCrumb.className = 'nav-crumb active';
    const matchedCases = getDirectCategoryCases(state.directCategory);
    catCrumb.textContent = `📌 ${catTitles[state.directCategory] || '사건 목록'} (${matchedCases.length}건)`;
    list.appendChild(catCrumb);

    if (btnUp) btnUp.style.display = 'inline-flex';
    return;
  }

  state.navPath.forEach((segment, idx) => {
    const arrow = document.createElement('span');
    arrow.className = 'nav-arrow';
    arrow.textContent = '›';
    list.appendChild(arrow);

    const crumb = document.createElement('span');
    const isLast = idx === state.navPath.length - 1;
    crumb.className = 'nav-crumb' + (isLast ? ' active' : '');
    crumb.textContent = segment.startsWith('0') || segment.startsWith('1') ? `🗓️ ${segment.replace('_', ' ')}` : `📁 ${segment}`;
    
    crumb.addEventListener('click', () => {
      state.navPath = state.navPath.slice(0, idx + 1);
      state.selectedIndex = 0;
      renderExplorer();
    });
    list.appendChild(crumb);
  });

  if (btnUp) {
    btnUp.style.display = state.navPath.length > 0 ? 'inline-flex' : 'none';
  }
}

// Render flat case cards directly when clicked from KPI cards (No year/month folder drilldown)
function renderDirectCategoryCaseCards(container) {
  let cases = getDirectCategoryCases(state.directCategory);

  if (state.activeFilter && state.activeFilter !== 'ALL') {
    cases = cases.filter(c => matchStatus(c.status, state.activeFilter));
  }

  if (cases.length === 0) {
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#99f6e4; font-size:16px;">해당 조건에 부합하는 사건이 없습니다.</div>';
    return;
  }

  // Sort descending by latest case number
  cases.sort((a, b) => (b.case_number || '').localeCompare(a.case_number || ''));

  const grid = document.createElement('div');
  grid.className = 'mockup-case-grid-3col';

  cases.forEach((caseItem) => {
    const card = createCaseCardElement(caseItem, false);
    state.modalVisibleItems.push(card);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function renderYearCards(container) {
  const yearSet = new Set();
  state.allCases.forEach(c => {
    if (c?.year && c.year !== '기타') yearSet.add(c.year);
  });
  const years = Array.from(yearSet).sort().reverse();
  if (years.length === 0) years.push('2026년');

  const grid = document.createElement('div');
  grid.className = 'mockup-folders-grid';

  years.forEach((yearStr) => {
    const yearCases = state.allCases.filter(c => c?.year === yearStr && matchStatus(c.status, state.activeFilter));
    const totalCount = yearCases.length;

    const breakdown = {
      신규: yearCases.filter(c => c.status === '신규접수').length,
      보정: yearCases.filter(c => c.status === '서류보정중').length,
      통장: yearCases.filter(c => c.status === '통장분석중').length,
      집회: yearCases.filter(c => c.status === '채권자집회대기').length,
      환가: yearCases.filter(c => c.status === '환가배당진행').length,
      종결: yearCases.filter(c => c.status === '면책종결').length
    };

    const card = document.createElement('div');
    card.className = 'folder-white-card';

    card.innerHTML = `
      <div class="folder-card-top">
        <span class="folder-card-title">${yearStr}</span>
        <span class="folder-card-sub">/ 배정 ${totalCount}건</span>
      </div>
      <div class="folder-breakdown-list">
        <div class="breakdown-item"><span class="check-icon">✓</span><span>신규 접수 ${breakdown.신규}건</span></div>
        <div class="breakdown-item"><span class="check-icon">✓</span><span>서류 보정 ${breakdown.보정}건</span></div>
        <div class="breakdown-item"><span class="check-icon">✓</span><span>통장 분석 ${breakdown.통장}건</span></div>
        <div class="breakdown-item"><span class="check-icon">✓</span><span>집회·보고 ${breakdown.집회}건</span></div>
        <div class="breakdown-item"><span class="check-icon">✓</span><span>환가·배당 ${breakdown.환가}건</span></div>
        <div class="breakdown-item"><span class="check-icon">✓</span><span>면책·종결 ${breakdown.종결}건</span></div>
      </div>
    `;

    card.addEventListener('click', () => {
      state.navPath = [yearStr];
      state.selectedIndex = 0;
      renderExplorer();
    });

    state.modalVisibleItems.push(card);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function renderMonthCards(container) {
  const selYear = state.navPath[0];
  
  // 1. Dynamically extract only existing month categories for this year
  const monthSet = new Set();
  state.allCases.forEach(c => {
    if (c?.year === selYear && c?.month_category && c.month_category !== '기타') {
      monthSet.add(c.month_category);
    }
  });

  // 2. Sort strictly in Descending order (Latest month first: 08월 -> 07월 -> 06월...)
  const months = Array.from(monthSet).sort().reverse();

  if (months.length === 0) {
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#99f6e4; font-size:16px;">등록된 배정 월 폴더가 없습니다.</div>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'mockup-folders-grid';

  months.forEach((monthFolder) => {
    const monthCases = state.allCases.filter(c => c?.year === selYear && c?.month_category === monthFolder && matchStatus(c.status, state.activeFilter));
    const totalCount = monthCases.length;
    const monthDisplay = monthFolder.replace('_', ' ');

    const breakdown = {
      신규: monthCases.filter(c => c.status === '신규접수').length,
      보정: monthCases.filter(c => c.status === '서류보정중').length,
      통장: monthCases.filter(c => c.status === '통장분석중').length,
      집회: monthCases.filter(c => c.status === '채권자집회대기').length,
      환가: monthCases.filter(c => c.status === '환가배당진행').length,
      종결: monthCases.filter(c => c.status === '면책종결').length
    };

    const card = document.createElement('div');
    card.className = 'folder-white-card';

    card.innerHTML = `
      <div class="folder-card-top">
        <span class="folder-card-title">${monthDisplay}</span>
        <span class="folder-card-sub">/ 배정 ${totalCount}건</span>
      </div>
      <div class="folder-breakdown-list">
        <div class="breakdown-item"><span class="check-icon">✓</span><span>신규 접수 ${breakdown.신규}건</span></div>
        <div class="breakdown-item"><span class="check-icon">✓</span><span>서류 보정 ${breakdown.보정}건</span></div>
        <div class="breakdown-item"><span class="check-icon">✓</span><span>통장 분석 ${breakdown.통장}건</span></div>
        <div class="breakdown-item"><span class="check-icon">✓</span><span>집회·보고 ${breakdown.집회}건</span></div>
        <div class="breakdown-item"><span class="check-icon">✓</span><span>환가·배당 ${breakdown.환가}건</span></div>
        <div class="breakdown-item"><span class="check-icon">✓</span><span>면책·종결 ${breakdown.종결}건</span></div>
      </div>
    `;

    card.addEventListener('click', () => {
      state.navPath = [selYear, monthFolder];
      state.selectedIndex = 0;
      renderExplorer();
    });

    state.modalVisibleItems.push(card);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function renderCaseCards(container) {
  const [selYear, selMonth] = state.navPath;
  const filtered = state.allCases.filter(c => c?.year === selYear && c?.month_category === selMonth && matchStatus(c.status, state.activeFilter));

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding:40px; text-align:center; color:#99f6e4; font-size:16px;">해당 배정 월에 등록된 사건이 없습니다.</div>';
    return;
  }

  // Sort case cards descending (Latest case numbers first)
  filtered.sort((a, b) => (b.case_number || '').localeCompare(a.case_number || ''));

  const grid = document.createElement('div');
  grid.className = 'mockup-case-grid-3col';

  filtered.forEach((caseItem) => {
    const card = createCaseCardElement(caseItem, false);
    state.modalVisibleItems.push(card);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}



function renderSearchResults(container) {
  const q = state.searchQuery.trim();
  const searchFields = ['case_number', 'debtor_name', 'court', 'phone'];
  
  const filtered = state.allCases.filter(c => 
    c && (
      searchFields.some(f => matchSearch(c[f], q)) ||
      matchSearch(c.status, q)
    ) && matchStatus(c.status, state.activeFilter)
  );

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding:40px; text-align:center; color:#99f6e4; font-size:16px;">"${q}" 에 일치하는 사건이 없습니다.</div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'mockup-case-grid-3col';

  filtered.forEach((caseItem) => {
    const card = createCaseCardElement(caseItem, true);
    state.modalVisibleItems.push(card);
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function createCaseCardElement(caseItem, showPath = false) {
  const card = document.createElement('div');
  const isSelected = state.selectedCase && state.selectedCase.case_number === caseItem?.case_number;
  card.className = 'case-white-card' + (isSelected ? ' selected' : '');
  
  const cfg = STATUS_CONFIG[caseItem?.status] || { color: '#0284c7', bg: '#e0f2fe', label: caseItem?.status || '신규' };

  const caseNo = caseItem?.case_number || '-';
  const debtorName = caseItem?.debtor_name || '-';
  const rawPhone = caseItem?.phone || '010-0000-0000';
  const phone = formatKoreanPhoneNumber(rawPhone);
  const court = caseItem?.court || '인천지방법원';
  const caseType = caseItem?.case_type === '법인파산' ? '법인' : '개인';
  const statusLabel = caseItem?.status || '신규접수';

  const debtAmt = formatKoreanFullAmount(caseItem?.total_debt || 0);
  const pathHtml = showPath ? `<div class="case-card-search-path">📁 ${caseItem?.year || ''} · ${(caseItem?.month_category || '').replace('_',' ')}</div>` : '';

  card.innerHTML = `
    <div class="case-card-header">
      <span class="case-card-no">${caseNo}</span>
      <span class="case-card-status-pill" style="background-color:${cfg.bg}; color:${cfg.color};">${statusLabel}</span>
    </div>
    ${pathHtml}
    <div class="case-card-debtor">${debtorName}</div>
    <div class="case-card-details">
      <div class="case-detail-row">
        <span class="check-icon">✓</span>
        <span>전화번호 : ${phone}</span>
      </div>
      <div class="case-detail-row">
        <span class="check-icon">✓</span>
        <span>채무액 : <strong>${debtAmt.shortKorean}</strong></span>
      </div>
    </div>
    <div class="case-card-footer">
      <span class="case-card-subinfo">${court} (${caseType})</span>
      <button class="btn-edit-date" title="배정 년도 및 월 변경 (폴더 이동)">🗓️ 이동</button>
    </div>
  `;

  // Edit Date Button Handler
  const editBtn = card.querySelector('.btn-edit-date');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMoveDateModal(caseItem);
    });
  }

  // Card Click Handler
  card.addEventListener('click', () => {
    selectCase(caseItem, true);
    closeExplorerModal();
  });

  return card;
}

// 9. Event Listeners Setup
function initEventListeners() {
  // Navigation: Dashboard Tab
  const navDashBtn = document.getElementById('navDashboardBtn');
  if (navDashBtn) {
    navDashBtn.addEventListener('click', () => switchView('dashboard'));
  }

  // Navigation: Back to Dashboard Button in Workspace
  const backToDashBtn = document.getElementById('backToDashBtn');
  if (backToDashBtn) {
    backToDashBtn.addEventListener('click', () => switchView('dashboard'));
  }

  // Navigation: Header Case Badge (Switch to workspace)
  const headerCaseBadge = document.getElementById('headerCaseBadge');
  if (headerCaseBadge) {
    headerCaseBadge.addEventListener('click', () => switchView('workspace'));
  }

  // Helper to open explorer with direct category case list (flat, no year/month folders)
  function openExplorerWithDirectCategory(catKey) {
    state.directCategory = catKey;
    state.activeFilter = 'ALL';
    state.searchQuery = '';
    const searchInput = document.getElementById('explorerSearchInput');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('modalClearSearchBtn');
    if (clearBtn) clearBtn.style.display = 'none';

    // Update status pills in explorer modal to ALL
    const pillBtns = document.querySelectorAll('.mockup-pill-btn');
    pillBtns.forEach(btn => {
      if (btn.getAttribute('data-status') === 'ALL') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    state.navPath = [];
    state.selectedIndex = 0;
    openExplorerModal();
  }

  // Modal Triggers: Standalone Stat Cards (Direct Flat Case List Query)
  const kpiActiveCard = document.getElementById('kpiActiveCard');
  if (kpiActiveCard) kpiActiveCard.addEventListener('click', () => openExplorerWithDirectCategory('ACTIVE'));

  const kpiInterviewCard = document.getElementById('kpiInterviewCard');
  if (kpiInterviewCard) kpiInterviewCard.addEventListener('click', () => openExplorerWithDirectCategory('INTERVIEW'));

  const kpiDocsCard = document.getElementById('kpiDocsCard');
  if (kpiDocsCard) kpiDocsCard.addEventListener('click', () => openExplorerWithDirectCategory('DOCS'));

  const kpiDeadlineCard = document.getElementById('kpiDeadlineCard');
  if (kpiDeadlineCard) kpiDeadlineCard.addEventListener('click', () => openExplorerWithDirectCategory('DEADLINE'));

  const kpiReportCard = document.getElementById('kpiReportCard');
  if (kpiReportCard) kpiReportCard.addEventListener('click', () => openExplorerWithDirectCategory('REPORTS'));

  const kpiExplorerCard = document.getElementById('kpiExplorerCard');
  if (kpiExplorerCard) kpiExplorerCard.addEventListener('click', () => {
    state.directCategory = null;
    state.navPath = [];
    state.activeFilter = 'ALL';
    state.selectedIndex = 0;
    openExplorerModal();
  });

  // Modal Triggers: 3x3 Explorer Modal
  const openExplorerBtn = document.getElementById('openExplorerBtn');
  if (openExplorerBtn) openExplorerBtn.addEventListener('click', () => {
    state.directCategory = null;
    state.navPath = [];
    state.activeFilter = 'ALL';
    state.selectedIndex = 0;
    openExplorerModal();
  });

  const dashOpenExplorerBtn = document.getElementById('dashOpenExplorerBtn');
  if (dashOpenExplorerBtn) dashOpenExplorerBtn.addEventListener('click', () => {
    state.directCategory = null;
    state.navPath = [];
    state.activeFilter = 'ALL';
    state.selectedIndex = 0;
    openExplorerModal();
  });

  const closeExplorerBtn = document.getElementById('closeExplorerBtn');
  if (closeExplorerBtn) closeExplorerBtn.addEventListener('click', closeExplorerModal);

  const overlay = document.getElementById('explorerModalOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeExplorerModal();
    });
  }

  // Modal Triggers: New Case Modal
  const headerNewBtn = document.getElementById('headerNewCaseBtn');
  if (headerNewBtn) headerNewBtn.addEventListener('click', openNewCaseModal);

  const openNewCaseBtn = document.getElementById('openNewCaseModalBtn');
  if (openNewCaseBtn) openNewCaseBtn.addEventListener('click', openNewCaseModal);

  // Explorer Search Box
  const searchInput = document.getElementById('explorerSearchInput');
  const clearBtn = document.getElementById('modalClearSearchBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (clearBtn) clearBtn.style.display = state.searchQuery ? 'block' : 'none';
      state.selectedIndex = 0;
      renderExplorer();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      state.searchQuery = '';
      if (searchInput) searchInput.value = '';
      clearBtn.style.display = 'none';
      state.selectedIndex = 0;
      renderExplorer();
    });
  }

  // Up Navigation Button
  const btnUp = document.getElementById('btnUpLevel');
  if (btnUp) {
    btnUp.addEventListener('click', () => {
      if (state.searchQuery.trim()) {
        state.searchQuery = '';
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
      } else if (state.directCategory) {
        state.directCategory = null;
        state.navPath = [];
      } else if (state.navPath.length > 0) {
        state.navPath.pop();
      }
      state.selectedIndex = 0;
      renderExplorer();
    });
  }

  // Weekly Calendar Navigation Buttons
  const btnCalPrev = document.getElementById('btnCalPrevWeek');
  if (btnCalPrev) {
    btnCalPrev.addEventListener('click', () => {
      state.calendarWeekOffset--;
      renderWeeklyCalendar();
    });
  }

  const btnCalNext = document.getElementById('btnCalNextWeek');
  if (btnCalNext) {
    btnCalNext.addEventListener('click', () => {
      state.calendarWeekOffset++;
      renderWeeklyCalendar();
    });
  }

  const btnCalToday = document.getElementById('btnCalToday');
  if (btnCalToday) {
    btnCalToday.addEventListener('click', () => {
      state.calendarWeekOffset = 0;
      renderWeeklyCalendar();
    });
  }

  // Filter Pill Buttons in Explorer
  const pillBtns = document.querySelectorAll('.mockup-pill-btn');
  pillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.getAttribute('data-status');
      state.selectedIndex = 0;
      renderExplorer();
    });
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', handleGlobalKeydown);

  // Workspace Action Buttons
  const copyCaseNoBtn = document.getElementById('copyCaseNoBtn');
  if (copyCaseNoBtn) {
    copyCaseNoBtn.addEventListener('click', () => {
      if (state.selectedCase?.case_number) {
        navigator.clipboard.writeText(state.selectedCase.case_number);
        showToast('📋 사건번호가 복사되었습니다.');
      }
    });
  }

  const copyDebtorBtn = document.getElementById('copyDebtorBtn');
  if (copyDebtorBtn) {
    copyDebtorBtn.addEventListener('click', () => {
      if (state.selectedCase?.debtor_name) {
        navigator.clipboard.writeText(state.selectedCase.debtor_name);
        showToast('📋 채무자명이 복사되었습니다.');
      }
    });
  }

  const openFolderBtn = document.getElementById('heroOpenFolderBtn');
  if (openFolderBtn) {
    openFolderBtn.addEventListener('click', () => {
      if (state.selectedCase?.folder_path) {
        openFolderOnDisk(state.selectedCase.folder_path);
      }
    });
  }

  const openCurFolderHeaderBtn = document.getElementById('openCurrentFolderBtn');
  if (openCurFolderHeaderBtn) {
    openCurFolderHeaderBtn.addEventListener('click', () => {
      if (state.selectedCase?.folder_path) {
        openFolderOnDisk(state.selectedCase.folder_path);
      }
    });
  }

  // Workspace Checkboxes & Quick Status Select
  const chkInterview = document.getElementById('flagInterviewDone');
  if (chkInterview) {
    chkInterview.addEventListener('change', () => {
      if (state.selectedCase) {
        updateCaseFlag(state.selectedCase, { interview_done: chkInterview.checked }, '상담 완료 상태가 변경되었습니다.');
      }
    });
  }

  const chkDocs = document.getElementById('flagDocsCompleted');
  if (chkDocs) {
    chkDocs.addEventListener('change', () => {
      if (state.selectedCase) {
        updateCaseFlag(state.selectedCase, { docs_completed: chkDocs.checked }, '서류 완비 상태가 변경되었습니다.');
      }
    });
  }

  const chkReport = document.getElementById('flagReportSubmitted');
  if (chkReport) {
    chkReport.addEventListener('change', () => {
      if (state.selectedCase) {
        updateCaseFlag(state.selectedCase, { report_submitted: chkReport.checked }, '보고서 제출 상태가 변경되었습니다.');
      }
    });
  }

  const selQuickStatus = document.getElementById('caseQuickStatusSelect');
  if (selQuickStatus) {
    selQuickStatus.addEventListener('change', () => {
      if (state.selectedCase) {
        updateCaseFlag(state.selectedCase, { status: selQuickStatus.value }, `사건 상태가 [${selQuickStatus.value}]로 변경되었습니다.`);
      }
    });
  }

  const tileInterview = document.getElementById('tileInterviewSchedule');
  if (tileInterview) {
    tileInterview.addEventListener('click', () => {
      if (state.selectedCase) {
        openInterviewScheduleModal(state.selectedCase);
      }
    });
  }

  setupNewCaseModal();
  setupMoveDateModal();
  setupInterviewScheduleModal();
}

function openExplorerModal() {
  const overlay = document.getElementById('explorerModalOverlay');
  if (overlay) {
    overlay.classList.add('open');
    state.selectedIndex = 0;
    renderExplorer();
    setTimeout(() => {
      const input = document.getElementById('explorerSearchInput');
      if (input) input.focus();
    }, 100);
  }
}

function closeExplorerModal() {
  const overlay = document.getElementById('explorerModalOverlay');
  if (overlay) overlay.classList.remove('open');
}

function handleGlobalKeydown(e) {
  const overlay = document.getElementById('explorerModalOverlay');
  const isExplorerOpen = overlay && overlay.classList.contains('open');

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (isExplorerOpen) closeExplorerModal();
    else openExplorerModal();
    return;
  }

  if (e.key === 'Escape') {
    if (isExplorerOpen) {
      e.preventDefault();
      closeExplorerModal();
      return;
    }
  }
}

// 10. New Case Registration Modal Handling
function openNewCaseModal() {
  const modal = document.getElementById('newCaseModal');
  if (modal) {
    modal.classList.add('open');
    const numInput = document.getElementById('newCaseNumber');
    if (numInput) setTimeout(() => numInput.focus(), 60);
  }
}

function setupNewCaseModal() {
  const modal = document.getElementById('newCaseModal');
  const closeBtn = document.getElementById('closeNewCaseModalBtn');
  const cancelBtn = document.getElementById('cancelNewCaseBtn');
  const form = document.getElementById('newCaseForm');
  if (!modal || !form) return;

  // 1. Phone number auto-formatter (000-0000-0000)
  const phoneInput = document.getElementById('newCasePhone');
  if (phoneInput && !phoneInput.dataset.bound) {
    phoneInput.dataset.bound = 'true';
    phoneInput.addEventListener('input', () => {
      phoneInput.value = formatKoreanPhoneNumber(phoneInput.value);
    });
  }

  // 2. Live debt formatting with commas and clean Korean reading (e.g. 💰 1억 2,345만 6,789원)
  const debtInput = document.getElementById('newCaseTotalDebt');
  const debtPreview = document.getElementById('koreanDebtPreview');

  const handleDebtInput = () => {
    if (!debtInput || !debtPreview) return;
    const rawVal = debtInput.value.replace(/[^0-9]/g, '');
    if (rawVal) {
      const num = parseInt(rawVal, 10);
      debtInput.value = num.toLocaleString('ko-KR');
      const full = formatKoreanFullAmount(num);
      debtPreview.textContent = `💰 ${full.shortKorean}`;
    } else {
      debtPreview.textContent = '💰 0원';
    }
  };

  if (debtInput && !debtInput.dataset.bound) {
    debtInput.dataset.bound = 'true';
    debtInput.addEventListener('input', handleDebtInput);
    debtInput.addEventListener('change', handleDebtInput);
  }

  const closeModal = () => modal.classList.remove('open');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const today = new Date();
    const curYear = String(today.getFullYear());
    const curMonth = String(today.getMonth() + 1).padStart(2, '0');

    const rawDebt = (document.getElementById('newCaseTotalDebt')?.value || '0').replace(/[^0-9]/g, '');
    const totalDebtNum = parseInt(rawDebt || '0', 10);

    const caseData = {
      year: document.getElementById('newCaseYear')?.value || curYear,
      month: document.getElementById('newCaseMonth')?.value || curMonth,
      case_number: document.getElementById('newCaseNumber')?.value.trim() || '',
      debtor_name: document.getElementById('newCaseDebtorName')?.value.trim() || '',
      phone: document.getElementById('newCasePhone')?.value.trim() || '010-0000-0000',
      case_type: document.getElementById('newCaseType')?.value || '개인파산',
      court: document.getElementById('newCaseCourt')?.value || '인천지방법원',
      total_debt: totalDebtNum,
      memo: document.getElementById('newCaseMemo')?.value.trim() || '신규 등록된 사건입니다.',
      status: '신규접수'
    };

    try {
      if (window.pywebview && window.pywebview.api) {
        const res = await window.pywebview.api.create_new_case(caseData);
        if (res.success) {
          showToast(`✅ [${caseData.case_number}] ${caseData.debtor_name} 등록 및 폴더 생성 완료!`);
          closeModal();
          await loadCases(false);
          state.navPath = [`${caseData.year}년`, `${caseData.month.padStart(2, '0')}월_배정사건`];
          renderDashboard();
          renderExplorer();
        } else {
          alert(`사건 생성 실패:\n${res.error}`);
        }
      }
    } catch (err) {
      alert(`사건 생성 중 오류가 발생했습니다: ${err}`);
    }
  });
}

// 11. Move Case Year/Month (Folder Relocation) Handling
function setupMoveDateModal() {
  const modal = document.getElementById('moveDateModal');
  const closeBtn = document.getElementById('closeMoveDateModalBtn');
  const cancelBtn = document.getElementById('cancelMoveDateBtn');
  const form = document.getElementById('moveDateForm');
  if (!modal || !form) return;

  const closeModal = () => {
    modal.classList.remove('open');
    state.caseToMove = null;
  };
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.caseToMove) return;

    const targetCase = state.caseToMove;
    const targetCaseNo = targetCase?.case_number || '';
    const targetDebtorName = targetCase?.debtor_name || '';
    const targetFolderPath = targetCase?.folder_path || '';

    const newYear = document.getElementById('moveDestYear')?.value || '2026';
    const newMonth = document.getElementById('moveDestMonth')?.value || '02';

    try {
      if (window.pywebview && window.pywebview.api) {
        const res = await window.pywebview.api.move_case_date(
          targetCaseNo,
          targetDebtorName,
          targetFolderPath,
          newYear,
          newMonth
        );

        if (res.success) {
          closeModal();
          showToast(`🚚 [${targetCaseNo}] ${newYear}년 ${newMonth}월로 이동 완료!`);
          await loadCases(true);
          state.navPath = [`${newYear}년`, `${newMonth.padStart(2, '0')}월_배정사건`];
          renderDashboard();
          renderExplorer();
        } else {
          alert(`⚠️ 폴더 이동 중단!\n\n${res.error}`);
        }
      }
    } catch (err) {
      alert(`폴더 이동 중 예기치 않은 오류가 발생했습니다: ${err}`);
    }
  });
}

function openMoveDateModal(caseItem) {
  if (!caseItem) return;
  state.caseToMove = caseItem;
  
  const titleEl = document.getElementById('moveTargetCaseTitle');
  if (titleEl) titleEl.textContent = `[${caseItem.case_number || ''}] ${caseItem.debtor_name || ''}`;
  const pathEl = document.getElementById('moveCurrentPathDisplay');
  if (pathEl) pathEl.textContent = `현재 위치: ${caseItem.year || ''} / ${(caseItem.month_category || '').replace('_', ' ')}`;

  const curY = (caseItem.year || '2026').replace('년', '');
  const curM = (caseItem.month_category || '02').substring(0, 2);

  const destY = document.getElementById('moveDestYear');
  if (destY) destY.value = curY;
  const destM = document.getElementById('moveDestMonth');
  if (destM) destM.value = curM;

  const modal = document.getElementById('moveDateModal');
  if (modal) modal.classList.add('open');
}

// 12. Open Folder via Python Desktop API
async function openFolderOnDisk(folderPath) {
  try {
    if (window.pywebview && window.pywebview.api) {
      const result = await window.pywebview.api.open_folder(folderPath);
      if (result.success) {
        showToast('📂 탐색기 폴더를 열었습니다.');
      } else {
        showToast(`폴더 열기 실패: ${result.error}`);
      }
    }
  } catch (err) {
    showToast('폴더 열기 중 오류가 발생했습니다.');
  }
}

// 13. Consultation Schedule Picker Modal (1-hour discrete slot reservation)
function setupInterviewScheduleModal() {
  const modal = document.getElementById('interviewScheduleModal');
  const closeBtn = document.getElementById('closeInterviewModalBtn');
  const cancelBtn = document.getElementById('cancelInterviewModalBtn');
  const form = document.getElementById('interviewScheduleForm');
  const dateInput = document.getElementById('interviewDatePicker');
  const timeSelect = document.getElementById('interviewTimePicker');
  if (!modal || !form) return;

  const closeModal = () => {
    modal.classList.remove('open');
    state.caseToSchedule = null;
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (dateInput) {
    dateInput.addEventListener('change', () => {
      const selDate = dateInput.value;
      const curCaseNo = state.caseToSchedule?.case_number;
      const curTime = state.caseToSchedule?.interview_time;
      populateInterviewTimeSelect(selDate, curCaseNo, curTime);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.caseToSchedule) return;

    const targetCase = state.caseToSchedule;
    const newDate = dateInput.value;
    const newTime = timeSelect.value;

    if (!newDate || !newTime) return;

    // Double-check collision
    const booked = getBookedInterviewTimes(newDate, targetCase.case_number);
    if (booked.includes(newTime)) {
      alert(`⚠️ [예약 중복]\n\n해당 시간대(${newDate} ${newTime})는 이미 다른 사건의 상담이 예약되어 있습니다.\n다른 시간대를 선택해주세요.`);
      return;
    }

    closeModal();
    await updateCaseFlag(
      targetCase,
      {
        assigned_date: newDate,
        interview_date: newDate,
        interview_time: newTime
      },
      `[${targetCase.debtor_name}] 상담 일시가 ${newDate} ${newTime}(으)로 예약되었습니다.`
    );
  });
}

function populateInterviewTimeSelect(selectedDate, excludeCaseNo, preferredTime = null) {
  const timeSelect = document.getElementById('interviewTimePicker');
  if (!timeSelect) return;
  timeSelect.innerHTML = '';

  // Find booked times with case info
  const bookedMap = {};
  (state.allCases || []).forEach(c => {
    if (c && c.case_number !== excludeCaseNo && c.status !== '면책종결' && !c.interview_done) {
      const dt = c.interview_date || c.assigned_date;
      if (dt === selectedDate && c.interview_time) {
        bookedMap[c.interview_time] = `${c.case_number} ${c.debtor_name || ''}`.trim();
      }
    }
  });

  let firstAvailable = null;

  CONSULTATION_HOURS.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h;
    if (bookedMap[h]) {
      opt.textContent = `🚫 ${h} (예약 마감 - ${bookedMap[h]})`;
      opt.disabled = true;
      opt.style.color = '#94a3b8';
    } else {
      opt.textContent = `🟢 ${h} (상담 예약 가능)`;
      if (!firstAvailable) firstAvailable = h;
    }

    if (preferredTime === h && !bookedMap[h]) {
      opt.selected = true;
    }
    timeSelect.appendChild(opt);
  });

  if (!timeSelect.value && firstAvailable) {
    timeSelect.value = firstAvailable;
  }
}

function openInterviewScheduleModal(caseItem) {
  if (!caseItem) return;
  state.caseToSchedule = caseItem;

  const titleEl = document.getElementById('interviewModalCaseTitle');
  if (titleEl) titleEl.textContent = `[${caseItem.case_number || ''}] ${caseItem.debtor_name || ''}`;

  const curDate = caseItem.interview_date || caseItem.assigned_date || toDateISO(new Date());
  const curTime = caseItem.interview_time || '10:00';

  const dispEl = document.getElementById('interviewModalCurrentDisplay');
  if (dispEl) dispEl.textContent = `현재 예약: ${curDate} ${curTime}`;

  const dateInput = document.getElementById('interviewDatePicker');
  if (dateInput) dateInput.value = curDate;

  populateInterviewTimeSelect(curDate, caseItem.case_number, curTime);

  const modal = document.getElementById('interviewScheduleModal');
  if (modal) modal.classList.add('open');
}

// 14. Toast Notification
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}
