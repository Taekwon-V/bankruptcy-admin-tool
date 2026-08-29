/**
 * 파산관제 스마트 매니저 - 3x3 Case Card Grid & Case Registration / Safe Move Logic (Null-Safe)
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

// 2. Status Grouping (6 Unified Pipeline Statuses)
function matchesStatusFilter(status, filterKey) {
  if (filterKey === 'ALL') return true;
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

// 3. Application State
const state = {
  allCases: [],
  selectedCase: null,
  navPath: [], // [] = Root/Years, ['2026년'] = Months, ['2026년', '02월_배정사건'] = Cases
  activeFilter: 'ALL',
  searchQuery: '',
  selectedIndex: 0,
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
      selectCase(febCase);
    } else {
      // Re-find current selected case safely
      const curNo = state.selectedCase?.case_number;
      const current = curNo ? state.allCases.find(c => c?.case_number === curNo) : null;
      if (current) {
        selectCase(current);
      } else {
        selectCase(state.allCases[0]);
      }
    }
  }
  
  updateStatusFilterCounts();
  renderExplorer();
}

// Update Top Pill Bar Text (Scoped Dynamically to Current NavPath Drill-down!)
function updateStatusFilterCounts() {
  let scopeCases = state.allCases;
  
  // Dynamic Drill-down Scope:
  if (state.searchQuery.trim()) {
    // If in search mode, count matching search results
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
  } else if (state.navPath.length === 1) {
    // Year folder scope (e.g. 2026년 -> exactly 20 cases)
    scopeCases = state.allCases.filter(c => c?.year === state.navPath[0]);
  } else if (state.navPath.length >= 2) {
    // Month folder scope (e.g. 2026년 / 02월_배정사건 -> exactly 10 cases)
    scopeCases = state.allCases.filter(c => c?.year === state.navPath[0] && c?.month_category === state.navPath[1]);
  }

  const counts = { ALL: 0, NEW: 0, DOC_CORRECTION: 0, BANK_ANALYSIS: 0, MEETING: 0, DIVIDEND: 0, CLOSED: 0 };
  scopeCases.forEach(c => {
    if (!c) return;
    counts.ALL++;
    if (matchesStatusFilter(c.status, 'NEW')) counts.NEW++;
    if (matchesStatusFilter(c.status, 'DOC_CORRECTION')) counts.DOC_CORRECTION++;
    if (matchesStatusFilter(c.status, 'BANK_ANALYSIS')) counts.BANK_ANALYSIS++;
    if (matchesStatusFilter(c.status, 'MEETING')) counts.MEETING++;
    if (matchesStatusFilter(c.status, 'DIVIDEND')) counts.DIVIDEND++;
    if (matchesStatusFilter(c.status, 'CLOSED')) counts.CLOSED++;
  });

  const setPill = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setPill('pill-all', `전체 : ${counts.ALL} 건`);
  setPill('pill-new', `신규 접수 : ${counts.NEW} 건`);
  setPill('pill-doc', `서류 보정 : ${counts.DOC_CORRECTION} 건`);
  setPill('pill-bank', `통장 분석 : ${counts.BANK_ANALYSIS} 건`);
  setPill('pill-meet', `집회·보고 : ${counts.MEETING} 건`);
  setPill('pill-dividend', `환가·배당 : ${counts.DIVIDEND} 건`);
  setPill('pill-closed', `면책·종결 : ${counts.CLOSED} 건`);
}

// 5. Render Case Explorer Modal
function renderExplorer() {
  const contentArea = document.getElementById('explorerContentArea');
  const summaryText = document.getElementById('explorerSummaryText');
  if (!contentArea) return;

  // Always update dynamic pill counts on every navigation / drilldown
  updateStatusFilterCounts();

  contentArea.innerHTML = '';
  state.modalVisibleItems = [];
  state.selectedIndex = -1; // Do not auto-select any card on load

  const query = state.searchQuery.trim();
  if (query) {
    renderSearchMode(contentArea, summaryText, query);
    return;
  }

  renderBreadcrumbs();

  if (state.navPath.length === 0) {
    renderYearCards(contentArea, summaryText);
  } else if (state.navPath.length === 1) {
    const year = state.navPath[0];
    renderMonthCards(contentArea, summaryText, year);
  } else if (state.navPath.length >= 2) {
    const year = state.navPath[0];
    const month = state.navPath[1];
    renderMonthCases(contentArea, summaryText, year, month);
  }
}

// Breadcrumb Path Bar
function renderBreadcrumbs() {
  const list = document.getElementById('breadcrumbsList');
  const upBtn = document.getElementById('btnUpLevel');
  if (!list) return;
  list.innerHTML = '';

  const rootItem = document.createElement('span');
  rootItem.className = 'nav-crumb' + (state.navPath.length === 0 ? ' active' : '');
  rootItem.textContent = '📁 사건저장소';
  rootItem.addEventListener('click', () => {
    state.navPath = [];
    renderExplorer();
  });
  list.appendChild(rootItem);

  state.navPath.forEach((seg, idx) => {
    const sep = document.createElement('span');
    sep.className = 'crumb-sep';
    sep.textContent = '›';
    list.appendChild(sep);

    const item = document.createElement('span');
    item.className = 'nav-crumb' + (idx === state.navPath.length - 1 ? ' active' : '');
    item.textContent = idx === 0 ? `📅 ${seg}` : `📆 ${seg.replace('_', ' ')}`;
    item.addEventListener('click', () => {
      state.navPath = state.navPath.slice(0, idx + 1);
      renderExplorer();
    });
    list.appendChild(item);
  });

  if (upBtn) upBtn.style.display = state.navPath.length > 0 ? 'inline-flex' : 'none';
}

// Level 0: Year Folder Cards (2 Columns)
function renderYearCards(container, summary) {
  const grid = document.createElement('div');
  grid.className = 'mockup-folders-grid';

  let years = Array.from(new Set(state.allCases.map(c => c?.year).filter(y => y && y !== '기타')));
  if (years.length === 0) years = ['2026년', '2025년'];
  years.sort().reverse();

  years.forEach((year) => {
    const casesInYear = state.allCases.filter(c => c?.year === year);
    
    const cNew = casesInYear.filter(c => matchesStatusFilter(c?.status, 'NEW')).length;
    const cDoc = casesInYear.filter(c => matchesStatusFilter(c?.status, 'DOC_CORRECTION')).length;
    const cBank = casesInYear.filter(c => matchesStatusFilter(c?.status, 'BANK_ANALYSIS')).length;
    const cMeet = casesInYear.filter(c => matchesStatusFilter(c?.status, 'MEETING')).length;
    const cDiv = casesInYear.filter(c => matchesStatusFilter(c?.status, 'DIVIDEND')).length;
    const cClosed = casesInYear.filter(c => matchesStatusFilter(c?.status, 'CLOSED')).length;

    const card = document.createElement('div');
    card.className = 'folder-white-card';
    card.innerHTML = `
      <div class="folder-card-top">
        <span class="folder-card-title">${year}</span>
        <span class="folder-card-sub">/ 배정 ${casesInYear.length}건</span>
      </div>
      <div class="folder-breakdown-list">
        <div class="breakdown-item"><span class="check-icon">✓</span> 신규 접수 ${cNew}건</div>
        <div class="breakdown-item"><span class="check-icon">✓</span> 서류 보정 ${cDoc}건</div>
        <div class="breakdown-item"><span class="check-icon">✓</span> 통장 분석 ${cBank}건</div>
        <div class="breakdown-item"><span class="check-icon">✓</span> 집회·보고 ${cMeet}건</div>
        <div class="breakdown-item"><span class="check-icon">✓</span> 환가·배당 ${cDiv}건</div>
        <div class="breakdown-item"><span class="check-icon">✓</span> 면책·종결 ${cClosed}건</div>
      </div>
    `;

    card.addEventListener('click', () => {
      state.navPath = [year];
      renderExplorer();
    });

    state.modalVisibleItems.push({ type: 'year', value: year, action: () => { state.navPath = [year]; renderExplorer(); } });
    grid.appendChild(card);
  });

  container.appendChild(grid);
  if (summary) summary.textContent = `사건저장소 최상위 폴더 (${years.length}개 연도 / 총 ${state.allCases.length}건)`;
}

// Level 1: Month Folder Cards (2 Columns)
function renderMonthCards(container, summary, year) {
  const grid = document.createElement('div');
  grid.className = 'mockup-folders-grid';

  let months = Array.from(new Set(state.allCases.filter(c => c?.year === year).map(c => c?.month_category).filter(m => m && m !== '기타')));
  if (months.length === 0) months = ['02월_배정사건', '01월_배정사건'];
  months.sort().reverse();

  months.forEach((month) => {
    const casesInMonth = state.allCases.filter(c => c?.year === year && c?.month_category === month);

    const cNew = casesInMonth.filter(c => matchesStatusFilter(c?.status, 'NEW')).length;
    const cDoc = casesInMonth.filter(c => matchesStatusFilter(c?.status, 'DOC_CORRECTION')).length;
    const cBank = casesInMonth.filter(c => matchesStatusFilter(c?.status, 'BANK_ANALYSIS')).length;
    const cMeet = casesInMonth.filter(c => matchesStatusFilter(c?.status, 'MEETING')).length;
    const cDiv = casesInMonth.filter(c => matchesStatusFilter(c?.status, 'DIVIDEND')).length;
    const cClosed = casesInMonth.filter(c => matchesStatusFilter(c?.status, 'CLOSED')).length;

    const card = document.createElement('div');
    card.className = 'folder-white-card';
    card.innerHTML = `
      <div class="folder-card-top">
        <span class="folder-card-title">${month.replace('_', ' ')}</span>
        <span class="folder-card-sub">/ 배정 ${casesInMonth.length}건</span>
      </div>
      <div class="folder-breakdown-list">
        <div class="breakdown-item"><span class="check-icon">✓</span> 신규 접수 ${cNew}건</div>
        <div class="breakdown-item"><span class="check-icon">✓</span> 서류 보정 ${cDoc}건</div>
        <div class="breakdown-item"><span class="check-icon">✓</span> 통장 분석 ${cBank}건</div>
        <div class="breakdown-item"><span class="check-icon">✓</span> 집회·보고 ${cMeet}건</div>
        <div class="breakdown-item"><span class="check-icon">✓</span> 환가·배당 ${cDiv}건</div>
        <div class="breakdown-item"><span class="check-icon">✓</span> 면책·종결 ${cClosed}건</div>
      </div>
    `;

    card.addEventListener('click', () => {
      state.navPath = [year, month];
      renderExplorer();
    });

    state.modalVisibleItems.push({ type: 'month', value: month, action: () => { state.navPath = [year, month]; renderExplorer(); } });
    grid.appendChild(card);
  });

  container.appendChild(grid);
  if (summary) summary.textContent = `${year} 배정 폴더 (${months.length}개 월)`;
}

// Level 2: 3x3 Case Cards Grid (3 Columns)
function renderMonthCases(container, summary, year, month) {
  const filteredCases = state.allCases.filter(c => 
    c &&
    c.year === year && 
    c.month_category === month && 
    matchesStatusFilter(c.status, state.activeFilter)
  );

  if (filteredCases.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #ffffff; font-size: 15px; font-weight: 600;">
        현재 선택된 [${state.activeFilter}] 상태 필터에 해당하는 사건이 이 폴더에 없습니다.
      </div>
    `;
    if (summary) summary.textContent = `${year} > ${month.replace('_', ' ')} (0건)`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'mockup-case-grid-3col';

  filteredCases.forEach((caseItem) => {
    const card = createCaseCardElement(caseItem, false);
    state.modalVisibleItems.push({ type: 'case', value: caseItem, action: () => { selectCase(caseItem); closeExplorerModal(); } });
    grid.appendChild(card);
  });

  container.appendChild(grid);
  if (summary) summary.textContent = `${year} > ${month.replace('_', ' ')} (총 ${filteredCases.length}건)`;
}

// Search Mode (Render matching Case Cards in 3 Columns)
function renderSearchMode(container, summary, query) {
  const list = document.getElementById('breadcrumbsList');
  if (list) {
    list.innerHTML = `<span class="nav-crumb active">🔍 검색 결과: "${query}"</span>`;
  }
  const upBtn = document.getElementById('btnUpLevel');
  if (upBtn) upBtn.style.display = 'none';

  const matches = state.allCases.filter(c => {
    if (!c) return false;
    const matchesQuery = (
      matchSearch(c.case_number, query) ||
      matchSearch(c.debtor_name, query) ||
      matchSearch(c.phone, query) ||
      matchSearch(c.court, query)
    );
    const matchesStatus = matchesStatusFilter(c.status, state.activeFilter);
    return matchesQuery && matchesStatus;
  });

  if (matches.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #ffffff; font-size: 15px; font-weight: 600;">
        "${query}" 검색어와 일치하는 사건이 없습니다.
      </div>
    `;
    if (summary) summary.textContent = `검색 결과 0건`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'mockup-case-grid-3col';

  matches.forEach((caseItem) => {
    const card = createCaseCardElement(caseItem, false, true);
    state.modalVisibleItems.push({ type: 'case', value: caseItem, action: () => { selectCase(caseItem); closeExplorerModal(); } });
    grid.appendChild(card);
  });

  container.appendChild(grid);
  if (summary) summary.textContent = `검색 결과 총 ${matches.length}건`;
}

// Create Case Card (3-Column Optimized)
function createCaseCardElement(caseItem, isSelected = false, showPath = false) {
  const card = document.createElement('div');
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
    selectCase(caseItem);
    closeExplorerModal();
  });

  return card;
}

// 6. Select and Render Case in Workspace
function selectCase(caseItem) {
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
  const metaAssigned = document.getElementById('metaAssignedDate');
  if (metaAssigned) metaAssigned.textContent = caseItem.assigned_date || '-';
  
  const debtWon = caseItem.total_debt || 0;
  let formattedDebt = debtWon >= 100000000 
    ? `${(debtWon / 100000000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억 원`
    : `${(debtWon / 10000).toLocaleString('ko-KR')}만 원`;
  const metaDebt = document.getElementById('metaDebtAmount');
  if (metaDebt) metaDebt.textContent = formattedDebt;

  const metaMeeting = document.getElementById('metaMeetingDate');
  if (metaMeeting) {
    if (caseItem.meeting_date) {
      const today = new Date();
      const meetingDate = new Date(caseItem.meeting_date);
      const diffDays = Math.ceil((meetingDate - today) / (1000 * 60 * 60 * 24));
      const ddayStr = diffDays >= 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;
      metaMeeting.textContent = `${caseItem.meeting_date} (${ddayStr})`;
    } else {
      metaMeeting.textContent = '기일 미정';
    }
  }

  const metaMemo = document.getElementById('metaMemoText');
  if (metaMemo) metaMemo.textContent = caseItem.memo || '기록된 메모가 없습니다.';

  updatePipelineStepper(caseItem.status);
  const folderPathDisplay = document.getElementById('currentFolderPathDisplay');
  if (folderPathDisplay) folderPathDisplay.textContent = caseItem.folder_path || '';
  updateSubfolderFiles(caseItem.subfolders || {});
}

function updatePipelineStepper(currentStatus) {
  const steps = ['신규접수', '서류보정중', '통장분석중', '채권자집회대기', '환가배당진행', '면책종결'];
  const currentIndex = steps.indexOf(currentStatus);

  document.querySelectorAll('.stepper-step').forEach((item) => {
    const stepName = item.getAttribute('data-step');
    const stepIndex = steps.indexOf(stepName);
    item.classList.remove('active', 'completed');

    if (stepIndex === currentIndex) {
      item.classList.add('active');
    } else if (stepIndex < currentIndex) {
      item.classList.add('completed');
    }
  });
}

function updateSubfolderFiles(subfolders) {
  const map = {
    '01_기본서류': { countId: 'count-01', listId: 'files-01', hint: '기본 서류 보관 위치' },
    '02_금융내역': { countId: 'count-02', listId: 'files-02', hint: '통장 엑셀/PDF를 드래그하여 저장' },
    '03_보정소명자료': { countId: 'count-03', listId: 'files-03', hint: '보정서 및 소명 영수증 보관' },
    '04_보고서_산출물': { countId: 'count-04', listId: 'files-04', hint: 'HWPX 보고서 & 배당표 출력 위치' }
  };

  Object.keys(map).forEach(subName => {
    const info = map[subName];
    const files = (subfolders && subfolders[subName]) || [];
    const countEl = document.getElementById(info.countId);
    const listEl = document.getElementById(info.listId);

    if (countEl) countEl.textContent = `${files.length}`;
    if (listEl) {
      listEl.innerHTML = '';
      if (files.length === 0) {
        listEl.innerHTML = `<li class="empty-state-hint">${info.hint}</li>`;
      } else {
        files.forEach(f => {
          const li = document.createElement('li');
          li.className = 'file-item-row';
          li.textContent = f;
          listEl.appendChild(li);
        });
      }
    }
  });
}

// 7. Event Listeners & Modals
function initEventListeners() {
  const modalOverlay = document.getElementById('explorerModalOverlay');
  const searchInput = document.getElementById('explorerSearchInput');
  const clearSearchBtn = document.getElementById('modalClearSearchBtn');

  const openModal = () => {
    if (!modalOverlay) return;
    modalOverlay.classList.add('open');
    if (searchInput) {
      searchInput.value = '';
      state.searchQuery = '';
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';
      renderExplorer();
      setTimeout(() => searchInput.focus(), 60);
    }
  };

  window.closeExplorerModal = () => {
    if (modalOverlay) modalOverlay.classList.remove('open');
  };

  const openExplorerBtn = document.getElementById('openExplorerBtn');
  if (openExplorerBtn && !openExplorerBtn.dataset.bound) {
    openExplorerBtn.dataset.bound = 'true';
    openExplorerBtn.addEventListener('click', openModal);
  }
  const headerCaseBadge = document.getElementById('headerCaseBadge');
  if (headerCaseBadge && !headerCaseBadge.dataset.bound) {
    headerCaseBadge.dataset.bound = 'true';
    headerCaseBadge.addEventListener('click', openModal);
  }

  const closeExplorerBtn = document.getElementById('closeExplorerBtn');
  if (closeExplorerBtn) closeExplorerBtn.addEventListener('click', closeExplorerModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeExplorerModal();
    });
  }

  const btnUp = document.getElementById('btnUpLevel');
  if (btnUp) {
    btnUp.addEventListener('click', () => {
      if (state.navPath.length > 0) {
        state.navPath.pop();
        renderExplorer();
      }
    });
  }

  // 5 Status Pill Buttons
  document.querySelectorAll('.mockup-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mockup-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeFilter = btn.getAttribute('data-status');
      renderExplorer();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (clearSearchBtn) clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
      renderExplorer();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderExplorer();
    });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (modalOverlay && modalOverlay.classList.contains('open')) {
        closeExplorerModal();
      } else {
        openModal();
      }
    }
    if (e.key === 'Escape') {
      const newModal = document.getElementById('newCaseModal');
      const moveModal = document.getElementById('moveDateModal');
      if (newModal && newModal.classList.contains('open')) {
        newModal.classList.remove('open');
      } else if (moveModal && moveModal.classList.contains('open')) {
        moveModal.classList.remove('open');
      } else if (modalOverlay && modalOverlay.classList.contains('open')) {
        closeExplorerModal();
      }
    }
  });

  // Arrow Keys Navigation
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      const items = document.querySelectorAll('.folder-white-card, .case-white-card');
      if (items.length === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        state.selectedIndex = (state.selectedIndex + 1) % items.length;
        highlightSelectedIndex(items);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        state.selectedIndex = (state.selectedIndex - 1 + items.length) % items.length;
        highlightSelectedIndex(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.modalVisibleItems[state.selectedIndex]) {
          state.modalVisibleItems[state.selectedIndex].action();
        }
      }
    });
  }

  // Open Folder
  const handleOpenCurrentFolder = () => {
    if (state.selectedCase && state.selectedCase.folder_path) {
      openFolderOnDisk(state.selectedCase.folder_path);
    }
  };
  ['openCurrentFolderBtn', 'heroOpenFolderBtn', 'folderExploreBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.dataset.bound) {
      el.dataset.bound = 'true';
      el.addEventListener('click', handleOpenCurrentFolder);
    }
  });

  // Copy Buttons
  const copyCaseNoBtn = document.getElementById('copyCaseNoBtn');
  if (copyCaseNoBtn) {
    copyCaseNoBtn.addEventListener('click', () => {
      if (state.selectedCase?.case_number) {
        navigator.clipboard.writeText(state.selectedCase.case_number);
        showToast(`사건번호 복사됨: ${state.selectedCase.case_number}`);
      }
    });
  }
  const copyDebtorBtn = document.getElementById('copyDebtorBtn');
  if (copyDebtorBtn) {
    copyDebtorBtn.addEventListener('click', () => {
      if (state.selectedCase?.debtor_name) {
        navigator.clipboard.writeText(state.selectedCase.debtor_name);
        showToast(`채무자명 복사됨: ${state.selectedCase.debtor_name}`);
      }
    });
  }

  // Half Screen Mode Toggle
  const halfBtn = document.getElementById('fitHalfScreenBtn');
  if (halfBtn) {
    halfBtn.addEventListener('click', () => {
      const container = document.getElementById('appContainer');
      if (container) {
        container.classList.toggle('half-screen-fixed');
        const isHalf = container.classList.contains('half-screen-fixed');
        showToast(isHalf ? '반 화면(너비 960px) 고정 모드' : '전체 창 확장 모드');
      }
    });
  }

  // Setup New Case Registration Modal
  setupNewCaseModal();

  // Setup Move Date Modal
  setupMoveDateModal();
}

// 8. New Case Registration Modal Handling
function setupNewCaseModal() {
  const modal = document.getElementById('newCaseModal');
  const openBtn = document.getElementById('openNewCaseModalBtn');
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

  // 2. Live debt formatting with commas and clean Korean reading (e.g. 💰 1억 2,345만 6,789 원)
  const debtInput = document.getElementById('newCaseTotalDebt');
  const debtPreview = document.getElementById('koreanDebtPreview');

  const handleDebtInput = () => {
    if (!debtInput || !debtPreview) return;
    const rawVal = debtInput.value.replace(/[^0-9]/g, '');
    if (rawVal) {
      const num = parseInt(rawVal, 10);
      debtInput.value = num.toLocaleString('ko-KR');
      const amt = formatKoreanFullAmount(num);
      debtPreview.textContent = `💰 ${amt.shortKorean}`;
    } else {
      debtInput.value = '';
      debtPreview.textContent = `💰 0원`;
    }
  };

  if (debtInput && !debtInput.dataset.bound) {
    debtInput.dataset.bound = 'true';
    debtInput.addEventListener('input', handleDebtInput);
  }

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      // Default to today's current Year and Month
      const today = new Date();
      const curYear = String(today.getFullYear());
      const curMonth = String(today.getMonth() + 1).padStart(2, '0');

      const yearEl = document.getElementById('newCaseYear');
      if (yearEl) {
        if (!yearEl.querySelector(`option[value="${curYear}"]`)) {
          const opt = document.createElement('option');
          opt.value = curYear;
          opt.textContent = `${curYear}년`;
          yearEl.appendChild(opt);
        }
        yearEl.value = curYear;
      }

      const monthEl = document.getElementById('newCaseMonth');
      if (monthEl) monthEl.value = curMonth;

      const courtEl = document.getElementById('newCaseCourt');
      if (courtEl) courtEl.value = '인천지방법원';

      if (phoneInput && !phoneInput.value) {
        phoneInput.value = '010-0000-0000';
      }

      if (debtInput) {
        debtInput.value = '100,000,000';
        handleDebtInput();
      }

      modal.classList.add('open');
      const numInput = document.getElementById('newCaseNumber');
      if (numInput) setTimeout(() => numInput.focus(), 60);
    });
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
          // Reload cases and navigate to the created month folder
          await loadCases(false);
          state.navPath = [`${caseData.year}년`, `${caseData.month.padStart(2, '0')}월_배정사건`];
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

// 9. Move Case Year/Month (Folder Relocation) Handling
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

    // Capture target case properties in local variables before any async/modal changes
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
          
          // Safely reload cases and navigate to new month
          await loadCases(true);
          state.navPath = [`${newYear}년`, `${newMonth.padStart(2, '0')}월_배정사건`];
          renderExplorer();
        } else {
          // File locked or permission error alert
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

function highlightSelectedIndex(items) {
  items.forEach((item, idx) => {
    const isSel = (idx === state.selectedIndex && state.selectedIndex >= 0);
    item.classList.toggle('selected', isSel);
    if (isSel) {
      item.scrollIntoView({ block: 'nearest' });
    }
  });
}

// 10. Open Folder via Python Desktop API
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

// 11. Toast Notification
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


