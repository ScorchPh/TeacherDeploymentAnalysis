<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { tnaStore } from '../stores/tnaStore'
import { JHS_SUBJECTS, SHS_SUBJECTS, type CategoryType } from '../types/tna'

const router = useRouter()
const levelFilter = ref<'ALL' | CategoryType>('ALL')

interface UnifiedSchoolRow {
  id: string
  category: CategoryType
  schoolId: string
  schoolName: string
  required: number
  existing: number
  gap: number
  transferOut: number
  transferIn: number
  needs: number
}

// Unified school metrics across ES, JHS, and SHS
const allSchoolRows = computed<UnifiedSchoolRow[]>(() => {
  const es: UnifiedSchoolRow[] = tnaStore.esRecords.map((r) => ({
    id: `ES-${r.id}`,
    category: 'ES',
    schoolId: r.schoolId,
    schoolName: r.schoolName,
    required: Number(r.required) || 0,
    existing: Number(r.existing) || 0,
    gap: tnaStore.calcEsGap(r),
    transferOut: Number(r.transferOut) || 0,
    transferIn: Number(r.transferIn) || 0,
    needs: tnaStore.calcEsNeeds(r),
  }))

  const jhs: UnifiedSchoolRow[] = tnaStore.jhsRecords.map((r) => ({
    id: `JHS-${r.id}`,
    category: 'JHS',
    schoolId: r.schoolId,
    schoolName: r.schoolName,
    required: tnaStore.calcJhsTotalRequired(r),
    existing: tnaStore.calcJhsTotalExisting(r),
    gap: tnaStore.calcJhsTotalGap(r),
    transferOut: tnaStore.calcJhsTotalTransferOut(r),
    transferIn: tnaStore.calcJhsTotalTransferIn(r),
    needs: tnaStore.calcJhsTotalNeeds(r),
  }))

  const shs: UnifiedSchoolRow[] = tnaStore.shsRecords.map((r) => ({
    id: `SHS-${r.id}`,
    category: 'SHS',
    schoolId: r.schoolId,
    schoolName: r.schoolName,
    required: tnaStore.calcShsTotalRequired(r),
    existing: tnaStore.calcShsTotalExisting(r),
    gap: tnaStore.calcShsTotalGap(r),
    transferOut: tnaStore.calcShsTotalTransferOut(r),
    transferIn: tnaStore.calcShsTotalTransferIn(r),
    needs: tnaStore.calcShsTotalNeeds(r),
  }))

  return [...es, ...jhs, ...shs]
})

const filteredSchools = computed(() =>
  levelFilter.value === 'ALL'
    ? allSchoolRows.value
    : allSchoolRows.value.filter((s) => s.category === levelFilter.value)
)

// Division-wide KPI totals
const totalSchoolsCount = computed(() => allSchoolRows.value.length)
const totalRequired = computed(() =>
  allSchoolRows.value.reduce((acc, s) => acc + s.required, 0)
)
const totalExisting = computed(() =>
  allSchoolRows.value.reduce((acc, s) => acc + s.existing, 0)
)
const totalGap = computed(() => totalRequired.value - totalExisting.value)
const totalTransferOut = computed(() =>
  allSchoolRows.value.reduce((acc, s) => acc + s.transferOut, 0)
)
const totalTransferIn = computed(() =>
  allSchoolRows.value.reduce((acc, s) => acc + s.transferIn, 0)
)
const totalNetNeeds = computed(
  () => totalGap.value + totalTransferOut.value - totalTransferIn.value
)
const fulfillmentRate = computed(() =>
  totalRequired.value > 0
    ? Math.min(100, Math.round((totalExisting.value / totalRequired.value) * 100))
    : 100
)

const schoolsWithShortageCount = computed(
  () => allSchoolRows.value.filter((s) => s.needs > 0).length
)
const schoolsWithExcessCount = computed(
  () => allSchoolRows.value.filter((s) => s.needs < 0).length
)
const schoolsBalancedCount = computed(
  () => allSchoolRows.value.filter((s) => s.needs === 0).length
)

// Level summary cards (ES, JHS, SHS)
const levelSummaries = computed(() => {
  const buildLevel = (cat: CategoryType, label: string, sub: string, path: string, icon: string) => {
    const rows = allSchoolRows.value.filter((r) => r.category === cat)
    const req = rows.reduce((a, r) => a + r.required, 0)
    const exist = rows.reduce((a, r) => a + r.existing, 0)
    const gap = req - exist
    const tout = rows.reduce((a, r) => a + r.transferOut, 0)
    const tin = rows.reduce((a, r) => a + r.transferIn, 0)
    const needs = gap + tout - tin
    const shortageSchools = rows.filter((r) => r.needs > 0).length
    const excessSchools = rows.filter((r) => r.needs < 0).length
    const pct = req > 0 ? Math.min(100, Math.round((exist / req) * 100)) : 100
    return {
      cat,
      label,
      sub,
      path,
      icon,
      schoolCount: rows.length,
      req,
      exist,
      gap,
      tout,
      tin,
      needs,
      shortageSchools,
      excessSchools,
      pct,
    }
  }

  return [
    buildLevel('ES', 'Elementary (ES)', 'General Elementary Faculty', '/es', '🏫'),
    buildLevel('JHS', 'Junior High (JHS)', '9 Core Subject Areas', '/jhs', '📘'),
    buildLevel('SHS', 'Senior High (SHS)', '10 Academic & TVL Tracks', '/shs', '🎓'),
  ]
})

// Most Needed Schools (Needs > 0, sorted descending)
const mostNeededSchools = computed(() =>
  filteredSchools.value
    .filter((s) => s.needs > 0)
    .sort((a, b) => b.needs - a.needs)
)

const maxSchoolNeed = computed(() =>
  mostNeededSchools.value.reduce((max, s) => Math.max(max, s.needs), 1)
)

// Excess / Surplus & Balanced Schools (Needs <= 0, sorted ascending so largest excess is first)
const excessAndBalancedSchools = computed(() =>
  filteredSchools.value
    .filter((s) => s.needs <= 0)
    .sort((a, b) => a.needs - b.needs)
)

// JHS Subject Breakdown (Most Needed vs Excess across all JHS schools)
const jhsSubjectStats = computed(() => {
  return JHS_SUBJECTS.map((subj) => {
    const req = tnaStore.jhsRecords.reduce((a, r) => a + (Number(r.required[subj]) || 0), 0)
    const exist = tnaStore.jhsRecords.reduce((a, r) => a + (Number(r.existing[subj]) || 0), 0)
    const tout = tnaStore.jhsRecords.reduce((a, r) => a + (Number(r.transferOut[subj]) || 0), 0)
    const tin = tnaStore.jhsRecords.reduce((a, r) => a + (Number(r.transferIn[subj]) || 0), 0)
    const gap = req - exist
    const needs = gap + tout - tin
    return { subject: subj, req, exist, gap, tout, tin, needs }
  }).sort((a, b) => b.needs - a.needs)
})

// SHS Track/Subject Breakdown (Most Needed vs Excess across all SHS schools)
const shsSubjectStats = computed(() => {
  return SHS_SUBJECTS.map((subj) => {
    const req = tnaStore.shsRecords.reduce((a, r) => a + (Number(r.required[subj]) || 0), 0)
    const exist = tnaStore.shsRecords.reduce((a, r) => a + (Number(r.existing[subj]) || 0), 0)
    const tout = tnaStore.shsRecords.reduce((a, r) => a + (Number(r.transferOut[subj]) || 0), 0)
    const tin = tnaStore.shsRecords.reduce((a, r) => a + (Number(r.transferIn[subj]) || 0), 0)
    const gap = req - exist
    const needs = gap + tout - tin
    return { subject: subj, req, exist, gap, tout, tin, needs }
  }).sort((a, b) => b.needs - a.needs)
})

// Recent Deployments
const recentDeployments = computed(() =>
  [...tnaStore.deploymentRecords].reverse().slice(0, 8)
)
</script>

<template>
  <div class="dashboard-view">
    <!-- 1. Top Division KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Monitored Schools</span>
        <div class="kpi-val">{{ totalSchoolsCount }}</div>
        <span class="kpi-sub">
          ES: {{ tnaStore.esRecords.length }} • JHS: {{ tnaStore.jhsRecords.length }} • SHS: {{ tnaStore.shsRecords.length }}
        </span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">Division Required</span>
        <div class="kpi-val text-primary">{{ totalRequired }}</div>
        <span class="kpi-sub">Total Teacher Demand</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">Division Existing</span>
        <div class="kpi-val">{{ totalExisting }}</div>
        <span class="kpi-sub">{{ fulfillmentRate }}% Staffing Filled</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">School Status Split</span>
        <div class="kpi-split">
          <span class="split-need">{{ schoolsWithShortageCount }} Need</span>
          <span class="split-sep">•</span>
          <span class="split-excess">{{ schoolsWithExcessCount }} Excess</span>
          <span class="split-sep">•</span>
          <span class="split-bal">{{ schoolsBalancedCount }} Even</span>
        </div>
        <span class="kpi-sub">Shortage vs Surplus Schools</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">Deployment Movements</span>
        <div class="kpi-split">
          <span class="t-out-txt">Out: {{ totalTransferOut }}</span>
          <span class="split-sep">|</span>
          <span class="t-in-txt">In: {{ totalTransferIn }}</span>
        </div>
        <span class="kpi-sub">{{ tnaStore.deploymentRecords.length }} Active Records</span>
      </div>

      <div class="kpi-card card-highlight">
        <span class="kpi-label">Division Net Needs</span>
        <div class="kpi-val" :class="totalNetNeeds > 0 ? 'text-danger' : 'text-green'">
          {{ totalNetNeeds > 0 ? `+${totalNetNeeds}` : totalNetNeeds }}
        </div>
        <span class="kpi-sub">(GAP + T-Out) - T-In</span>
      </div>
    </div>

    <!-- 2. Level Breakdown Cards (ES, JHS, SHS) -->
    <div class="level-grid">
      <div v-for="lvl in levelSummaries" :key="lvl.cat" class="level-card">
        <div class="level-header">
          <div class="level-title-wrap">
            <span class="level-icon">{{ lvl.icon }}</span>
            <div>
              <h3 class="level-title">{{ lvl.label }}</h3>
              <span class="level-sub">{{ lvl.sub }} • {{ lvl.schoolCount }} Schools</span>
            </div>
          </div>
          <button class="btn-link" @click="router.push(lvl.path)">
            Open {{ lvl.cat }} →
          </button>
        </div>

        <div class="level-stats-row">
          <div class="stat-pill">
            <span class="stat-lbl">Required</span>
            <strong>{{ lvl.req }}</strong>
          </div>
          <div class="stat-pill">
            <span class="stat-lbl">Existing</span>
            <strong>{{ lvl.exist }}</strong>
          </div>
          <div class="stat-pill">
            <span class="stat-lbl">GAP</span>
            <strong :class="lvl.gap > 0 ? 'text-red' : lvl.gap < 0 ? 'text-blue' : ''">
              {{ lvl.gap > 0 ? `+${lvl.gap}` : lvl.gap }}
            </strong>
          </div>
          <div class="stat-pill">
            <span class="stat-lbl">T-Out / In</span>
            <strong>{{ lvl.tout }} / {{ lvl.tin }}</strong>
          </div>
          <div class="stat-pill stat-pill-needs">
            <span class="stat-lbl">Net Needs</span>
            <strong :class="lvl.needs > 0 ? 'text-red' : lvl.needs < 0 ? 'text-blue' : 'text-green'">
              {{ lvl.needs > 0 ? `+${lvl.needs}` : lvl.needs }}
            </strong>
          </div>
        </div>

        <div class="progress-wrap">
          <div class="progress-meta">
            <span>Staffing Fulfillment: <strong>{{ lvl.pct }}%</strong></span>
            <span>
              <strong class="text-red">{{ lvl.shortageSchools }}</strong> with shortage •
              <strong class="text-blue">{{ lvl.excessSchools }}</strong> with excess
            </span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${lvl.pct}%` }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Filter Bar for School Rankings -->
    <div class="section-bar">
      <div>
        <h2 class="section-heading">School Shortage & Excess Analytics</h2>
        <p class="section-sub">Ranked comparison of schools needing teachers most vs schools with surplus faculty</p>
      </div>
      <div class="filter-group">
        <button class="filter-pill" :class="{ active: levelFilter === 'ALL' }" @click="levelFilter = 'ALL'">
          All Levels ({{ allSchoolRows.length }})
        </button>
        <button class="filter-pill" :class="{ active: levelFilter === 'ES' }" @click="levelFilter = 'ES'">
          ES ({{ tnaStore.esRecords.length }})
        </button>
        <button class="filter-pill" :class="{ active: levelFilter === 'JHS' }" @click="levelFilter = 'JHS'">
          JHS ({{ tnaStore.jhsRecords.length }})
        </button>
        <button class="filter-pill" :class="{ active: levelFilter === 'SHS' }" @click="levelFilter = 'SHS'">
          SHS ({{ tnaStore.shsRecords.length }})
        </button>
      </div>
    </div>

    <!-- 4. Side-by-Side Most Needed vs Excess Schools -->
    <div class="two-col-grid">
      <!-- Left: Most Needed Schools -->
      <div class="panel-card">
        <div class="panel-header header-danger">
          <div>
            <h3 class="panel-title">🔥 Most Needed Schools (Teacher Shortage)</h3>
            <span class="panel-sub">Schools with highest net teacher needs (Needs &gt; 0)</span>
          </div>
          <span class="count-chip chip-danger">{{ mostNeededSchools.length }} Schools</span>
        </div>

        <div class="panel-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th>#</th>
                <th>School</th>
                <th>Level</th>
                <th class="col-num">Req</th>
                <th class="col-num">Exist</th>
                <th class="col-num">Out/In</th>
                <th class="col-num">Net Needs</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, idx) in mostNeededSchools" :key="s.id">
                <td class="rank-cell">{{ idx + 1 }}</td>
                <td>
                  <div class="school-cell-name">{{ s.schoolName }}</div>
                  <div class="need-bar-track">
                    <div
                      class="need-bar-fill"
                      :style="{ width: `${Math.min(100, Math.round((s.needs / maxSchoolNeed) * 100))}%` }"
                    ></div>
                  </div>
                </td>
                <td>
                  <span class="cat-badge" :class="`cat-${s.category.toLowerCase()}`">{{ s.category }}</span>
                </td>
                <td class="col-num">{{ s.required }}</td>
                <td class="col-num">{{ s.existing }}</td>
                <td class="col-num text-muted">{{ s.transferOut }} / {{ s.transferIn }}</td>
                <td class="col-num">
                  <span class="badge badge-danger">+{{ s.needs }} Needs</span>
                </td>
              </tr>
              <tr v-if="mostNeededSchools.length === 0">
                <td colspan="7" class="empty-cell">No schools with teacher shortage in this filter.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right: Excess / Surplus & Balanced Schools -->
      <div class="panel-card">
        <div class="panel-header header-surplus">
          <div>
            <h3 class="panel-title">💎 Excess / Surplus & Balanced Schools</h3>
            <span class="panel-sub">Schools with surplus teachers (Excess &lt; 0) or balanced staffing (0)</span>
          </div>
          <span class="count-chip chip-surplus">{{ excessAndBalancedSchools.length }} Schools</span>
        </div>

        <div class="panel-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th>#</th>
                <th>School</th>
                <th>Level</th>
                <th class="col-num">Req</th>
                <th class="col-num">Exist</th>
                <th class="col-num">Out/In</th>
                <th class="col-num">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, idx) in excessAndBalancedSchools" :key="s.id">
                <td class="rank-cell">{{ idx + 1 }}</td>
                <td class="font-semibold">{{ s.schoolName }}</td>
                <td>
                  <span class="cat-badge" :class="`cat-${s.category.toLowerCase()}`">{{ s.category }}</span>
                </td>
                <td class="col-num">{{ s.required }}</td>
                <td class="col-num">{{ s.existing }}</td>
                <td class="col-num text-muted">{{ s.transferOut }} / {{ s.transferIn }}</td>
                <td class="col-num">
                  <span
                    class="badge"
                    :class="s.needs < 0 ? 'badge-surplus' : 'badge-success'"
                  >
                    {{ s.needs < 0 ? `${s.needs} Excess` : '0 Balanced' }}
                  </span>
                </td>
              </tr>
              <tr v-if="excessAndBalancedSchools.length === 0">
                <td colspan="7" class="empty-cell">No excess or balanced schools in this filter.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 5. Subject & Track Needs Analytics (JHS & SHS) -->
    <div class="two-col-grid">
      <!-- JHS Subject Ranking -->
      <div class="panel-card">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">📘 JHS Subject Needs vs Excess</h3>
            <span class="panel-sub">Ranked across all {{ tnaStore.jhsRecords.length }} Junior High Schools</span>
          </div>
          <button class="btn-link" @click="router.push('/jhs')">JHS Matrix →</button>
        </div>

        <div class="panel-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th>Subject Area</th>
                <th class="col-num">Required</th>
                <th class="col-num">Existing</th>
                <th class="col-num">GAP</th>
                <th class="col-num">Out / In</th>
                <th class="col-num">Net Needs</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in jhsSubjectStats" :key="item.subject">
                <td class="font-bold">{{ item.subject }}</td>
                <td class="col-num">{{ item.req }}</td>
                <td class="col-num">{{ item.exist }}</td>
                <td class="col-num" :class="item.gap > 0 ? 'text-red' : item.gap < 0 ? 'text-blue' : ''">
                  {{ item.gap > 0 ? `+${item.gap}` : item.gap }}
                </td>
                <td class="col-num text-muted">{{ item.tout }} / {{ item.tin }}</td>
                <td class="col-num">
                  <span
                    class="badge"
                    :class="
                      item.needs > 0
                        ? 'badge-danger'
                        : item.needs < 0
                        ? 'badge-surplus'
                        : 'badge-success'
                    "
                  >
                    {{
                      item.needs > 0
                        ? `+${item.needs} Needs`
                        : item.needs < 0
                        ? `${item.needs} Excess`
                        : '0 Balanced'
                    }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- SHS Track / Specialization Ranking -->
      <div class="panel-card">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">🎓 SHS Track / Subject Needs vs Excess</h3>
            <span class="panel-sub">Ranked across all {{ tnaStore.shsRecords.length }} Senior High Schools</span>
          </div>
          <button class="btn-link" @click="router.push('/shs')">SHS Matrix →</button>
        </div>

        <div class="panel-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th>Track / Subject</th>
                <th class="col-num">Required</th>
                <th class="col-num">Existing</th>
                <th class="col-num">GAP</th>
                <th class="col-num">Out / In</th>
                <th class="col-num">Net Needs</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in shsSubjectStats" :key="item.subject">
                <td class="font-bold">{{ item.subject }}</td>
                <td class="col-num">{{ item.req }}</td>
                <td class="col-num">{{ item.exist }}</td>
                <td class="col-num" :class="item.gap > 0 ? 'text-red' : item.gap < 0 ? 'text-blue' : ''">
                  {{ item.gap > 0 ? `+${item.gap}` : item.gap }}
                </td>
                <td class="col-num text-muted">{{ item.tout }} / {{ item.tin }}</td>
                <td class="col-num">
                  <span
                    class="badge"
                    :class="
                      item.needs > 0
                        ? 'badge-danger'
                        : item.needs < 0
                        ? 'badge-surplus'
                        : 'badge-success'
                    "
                  >
                    {{
                      item.needs > 0
                        ? `+${item.needs} Needs`
                        : item.needs < 0
                        ? `${item.needs} Excess`
                        : '0 Balanced'
                    }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 6. Recent Deployments & Transfers Feed -->
    <div class="panel-card">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">📋 Recent Teacher Deployments & Transfers</h3>
          <span class="panel-sub">Latest Transfer In / Transfer Out movements across ES, JHS, and SHS</span>
        </div>
        <span class="count-chip">{{ tnaStore.deploymentRecords.length }} Total Deployments</span>
      </div>

      <div class="panel-table-wrap">
        <table class="dash-table">
          <thead>
            <tr>
              <th>Applicant Name</th>
              <th>Level</th>
              <th>School / Movement Route</th>
              <th>Subject</th>
              <th>Position</th>
              <th>Date Added</th>
              <th class="col-num">Type</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in recentDeployments" :key="d.id">
              <td class="font-bold">{{ d.lastName }}, {{ d.firstName }} {{ d.middleName }}</td>
              <td>
                <span class="cat-badge" :class="`cat-${d.category.toLowerCase()}`">{{ d.category }}</span>
              </td>
              <td class="font-semibold">
                <template v-if="d.transferType === 'OUT' && d.toSchoolName">
                  <span class="route-from">{{ d.schoolName }}</span>
                  <span class="route-arr">→</span>
                  <span class="route-to">{{ d.toSchoolName }}</span>
                </template>
                <template v-else>
                  {{ d.schoolName }}
                </template>
              </td>
              <td>{{ d.subject || 'General (ES)' }}</td>
              <td>{{ d.currentPosition }}</td>
              <td class="text-muted">{{ d.dateAdded }}</td>
              <td class="col-num">
                <span class="badge" :class="d.transferType === 'IN' ? 'badge-success' : 'badge-out'">
                  {{ d.transferType === 'IN' ? '⬇ Transfer In' : '⬆ Transfer Out' }}
                </span>
              </td>
            </tr>
            <tr v-if="recentDeployments.length === 0">
              <td colspan="7" class="empty-cell">
                No deployment records added yet. Open ES, JHS, or SHS and switch to the <strong>Deployment</strong> tab to record teacher transfers.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  padding-bottom: 2rem;
}

/* 1. KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1rem 1.15rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card-highlight {
  background: #fff1f2;
  border-color: #fecdd3;
}

.kpi-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.kpi-val {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-text-main);
  line-height: 1.2;
}

.kpi-sub {
  font-size: 0.72rem;
  color: var(--color-text-light);
}

.kpi-split {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.92rem;
  font-weight: 700;
  min-height: 1.9rem;
}

.split-need {
  color: #dc2626;
}
.split-excess {
  color: #0284c7;
}
.split-bal {
  color: #16a34a;
}
.split-sep {
  color: #cbd5e1;
}
.t-out-txt {
  color: #ea580c;
}
.t-in-txt {
  color: #059669;
}

/* 2. Level Breakdown Cards */
.level-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.level-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.15rem 1.25rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.level-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.level-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.level-icon {
  font-size: 1.5rem;
  background: #f1f5f9;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.level-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: #0f172a;
}

.level-sub {
  font-size: 0.75rem;
  color: #64748b;
}

.btn-link {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: var(--color-primary);
  font-size: 0.76rem;
  font-weight: 700;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  cursor: pointer;
}
.btn-link:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

.level-stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.4rem;
  background: #f8fafc;
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.stat-pill-needs {
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.stat-lbl {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
}

.progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.74rem;
  color: #475569;
}

.progress-track {
  height: 7px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #10b981);
  border-radius: 999px;
}

/* 3. Section Bar */
.section-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.85rem 1.25rem;
  box-shadow: var(--shadow-sm);
}

.section-heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
}

.section-sub {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: #64748b;
}

.filter-group {
  display: flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 0.2rem;
  gap: 0.2rem;
}

.filter-pill {
  border: none;
  background: transparent;
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
}

.filter-pill.active {
  background: #ffffff;
  color: var(--color-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* 4. Two-Column Analytics Panels */
.two-col-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.panel-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 0.9rem 1.15rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8fafc;
}

.header-danger {
  background: #fff1f2;
  border-bottom-color: #fecdd3;
}

.header-surplus {
  background: #f0f9ff;
  border-bottom-color: #bae6fd;
}

.panel-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
}

.panel-sub {
  font-size: 0.74rem;
  color: #64748b;
}

.count-chip {
  font-size: 0.74rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: #e2e8f0;
  color: #334155;
}

.chip-danger {
  background: #fecdd3;
  color: #9f1239;
}

.chip-surplus {
  background: #bae6fd;
  color: #075985;
}

.panel-table-wrap {
  overflow-x: auto;
  max-height: 380px;
  overflow-y: auto;
}

.dash-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.dash-table th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  color: #475569;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.dash-table td {
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
}

.dash-table tbody tr:hover {
  background: #f8fafc;
}

.rank-cell {
  width: 32px;
  font-weight: 700;
  color: #64748b;
}

.school-cell-name {
  font-weight: 700;
  margin-bottom: 0.2rem;
}

.need-bar-track {
  height: 4px;
  background: #fee2e2;
  border-radius: 999px;
  overflow: hidden;
  width: 120px;
}

.need-bar-fill {
  height: 100%;
  background: #ef4444;
  border-radius: 999px;
}

.col-num {
  text-align: right !important;
}

.cat-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
}
.cat-es {
  background: #dbeafe;
  color: #1e40af;
}
.cat-jhs {
  background: #fef3c7;
  color: #92400e;
}
.cat-shs {
  background: #ede9fe;
  color: #5b21b6;
}

.badge {
  display: inline-block;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}
.badge-danger {
  background: #fee2e2;
  color: #b91c1c;
}
.badge-surplus {
  background: #e0f2fe;
  color: #0369a1;
}
.badge-success {
  background: #dcfce7;
  color: #15803d;
}
.badge-out {
  background: #ffedd5;
  color: #c2410c;
}

.route-from {
  color: #c2410c;
}
.route-arr {
  margin: 0 0.3rem;
  color: #64748b;
}
.route-to {
  color: #047857;
}

.empty-cell {
  text-align: center;
  padding: 2rem 1rem !important;
  color: #94a3b8;
}

.text-primary {
  color: var(--color-primary);
}
.text-red {
  color: #dc2626;
}
.text-blue {
  color: #0284c7;
}
.text-green {
  color: #16a34a;
}
.text-danger {
  color: #b91c1c;
}
.text-muted {
  color: #64748b;
}
.font-bold {
  font-weight: 700;
}
.font-semibold {
  font-weight: 600;
}
</style>
