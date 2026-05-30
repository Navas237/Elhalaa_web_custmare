export const DEFAULT_CONFIG = {
  GRID_STEP: 10,
  MAX_OVERLAP: 10,
  MIN_USABLE_GAP: 10,
  SPACING_MIN: 60,
  PDR_CAP: 100.0,
  BUFFER_MINUTES: 0,
  WEIGHT_PDR: 0.40,
  WEIGHT_ADJACENCY: 0.25,
  WEIGHT_EARLINESS: 0.20,
  WEIGHT_FRAGMENTATION: 0.15,
}

export function timeToMinutes(timeStr: string | number): number {
  if (typeof timeStr === 'number') return timeStr
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function minutesToArabicTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const period = h >= 12 ? 'م' : 'ص'
  const displayH = h % 12 || 12
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`
}

export function snapToGridCeil(minutes: number, gridStep: number): number {
  const remainder = minutes % gridStep
  return remainder === 0 ? minutes : minutes + (gridStep - remainder)
}

export function nowMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function isToday(dateStr: string): boolean {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return dateStr === todayStr
}

export class SmartBookingEngine {
  config: typeof DEFAULT_CONFIG

  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  findSmartSlots({
    staffId,
    dateStr,
    serviceDuration,
    shiftStart,
    shiftEnd,
    existingBookings = [],
  }: {
    staffId: string
    dateStr: string
    serviceDuration: number
    shiftStart: string
    shiftEnd: string
    existingBookings: any[]
  }) {
    const { GRID_STEP, MAX_OVERLAP, BUFFER_MINUTES, PDR_CAP } = this.config

    const shiftStartMin = timeToMinutes(shiftStart)
    const shiftEndMin = timeToMinutes(shiftEnd)
    const duration = serviceDuration

    if (duration < GRID_STEP) {
      return { success: false, slots: [] }
    }

    if (shiftEndMin - shiftStartMin < duration) {
      return { success: false, slots: [] }
    }

    const activeBookings = existingBookings
      .filter(b => !['cancelled', 'no_show'].includes(b.status))
      .map(b => ({
        ...b,
        startMin: timeToMinutes(b.start_time),
        endMin: timeToMinutes(b.end_time),
      }))
      .sort((a, b) => a.startMin - b.startMin)

    const freeBlocks = this._extractFreeBlocks(shiftStartMin, shiftEndMin, activeBookings)
    const candidates: any[] = []

    for (const block of freeBlocks) {
      let slotStart = snapToGridCeil(block.start, GRID_STEP)

      while (slotStart + duration <= block.end) {
        const slotEnd = slotStart + duration
        const displayStart = this._computeDisplayStart(slotStart, activeBookings, MAX_OVERLAP)

        if (!this._hasActualOverlap(slotStart, slotEnd, activeBookings)) {
          candidates.push({
            display_start_time: minutesToTime(displayStart),
            display_start_arabic: minutesToArabicTime(displayStart),
            actual_start_time: minutesToTime(slotStart),
            actual_start_arabic: minutesToArabicTime(slotStart),
            end_time: minutesToTime(slotEnd),
            end_time_arabic: minutesToArabicTime(slotEnd),
            startMin: slotStart,
            endMin: slotEnd,
            displayStartMin: displayStart,
            block,
            pdr: 0,
            adjacencyBonus: 0,
            earliness: 0,
            fragmentationPenalty: 0,
            score: 0,
          })
        }
        slotStart += GRID_STEP
      }
    }

    let filteredCandidates = candidates
    if (isToday(dateStr)) {
      const cutoff = nowMinutes() + BUFFER_MINUTES
      filteredCandidates = candidates.filter(c => c.startMin > cutoff)
    }

    if (filteredCandidates.length === 0) {
      return { success: false, slots: [] }
    }

    for (const c of filteredCandidates) {
      c.pdr = this._computePackingDensityRatio(c, c.block, duration)
      c.adjacencyBonus = this._computeAdjacencyBonus(c, activeBookings)
      c.earliness = this._normalizeEarliness(c.startMin, shiftStartMin, shiftEndMin)
      c.fragmentationPenalty = this._computeFragmentationPenalty(c, c.block)

      c.score =
        this.config.WEIGHT_PDR * this._normalizePDR(c.pdr) +
        this.config.WEIGHT_ADJACENCY * c.adjacencyBonus +
        this.config.WEIGHT_EARLINESS * c.earliness -
        this.config.WEIGHT_FRAGMENTATION * c.fragmentationPenalty
    }

    const suggestionCount = this._determineSuggestionCount(activeBookings.length, shiftEndMin, dateStr)
    const minSpacing = Math.max(duration, this.config.SPACING_MIN)

    filteredCandidates.sort((a, b) => b.score - a.score)

    const smartSlots: any[] = []
    for (const c of filteredCandidates) {
      if (smartSlots.length >= suggestionCount) break

      const isSufficientlySpaced = smartSlots.every(
        s => Math.abs(c.startMin - s.startMin) >= minSpacing
      )

      if (isSufficientlySpaced) {
        smartSlots.push(c)
      }
    }

    smartSlots.sort((a, b) => a.displayStartMin - b.displayStartMin)

    if (smartSlots.length === 0) {
      return { success: false, slots: [] }
    }

    const result = smartSlots.map(s => ({
      display_start_time: s.display_start_time,
      display_start_arabic: s.display_start_arabic,
      actual_start_time: s.actual_start_time,
      actual_start_arabic: s.actual_start_arabic,
      end_time: s.end_time,
      end_time_arabic: s.end_time_arabic,
      score: Math.round(s.score * 100) / 100,
      packing_density_ratio: Math.round(s.pdr * 100) / 100,
    }))

    return { success: true, slots: result }
  }

  _extractFreeBlocks(shiftStart: number, shiftEnd: number, bookings: any[]) {
    const blocks: any[] = []
    let pointer = shiftStart

    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i]
      if (pointer < booking.startMin) {
        blocks.push({
          start: pointer,
          end: booking.startMin,
        })
      }
      if (pointer < booking.endMin) {
        pointer = booking.endMin
      }
    }

    if (pointer < shiftEnd) {
      blocks.push({
        start: pointer,
        end: shiftEnd,
      })
    }

    return blocks
  }

  _computeDisplayStart(actualStartMin: number, bookings: any[], maxOverlap: number) {
    let preceding = null
    for (const b of bookings) {
      if (b.endMin <= actualStartMin) {
        preceding = b
      } else {
        break
      }
    }

    if (!preceding) return actualStartMin

    const gap = actualStartMin - preceding.endMin

    if (gap === 0) {
      return Math.max(actualStartMin - maxOverlap, preceding.startMin + this.config.GRID_STEP)
    } else if (gap <= maxOverlap) {
      const displayStart = preceding.endMin - Math.min(gap, maxOverlap)
      return Math.max(displayStart, preceding.startMin + this.config.GRID_STEP)
    }

    return actualStartMin
  }

  _hasActualOverlap(startMin: number, endMin: number, bookings: any[]) {
    for (const b of bookings) {
      if (startMin < b.endMin && endMin > b.startMin) {
        return true
      }
    }
    return false
  }

  _computePackingDensityRatio(candidate: any, block: any, duration: number) {
    const { MIN_USABLE_GAP, PDR_CAP } = this.config

    const gapFilled = Math.min(candidate.endMin, block.end) - Math.max(candidate.startMin, block.start)
    const leftGap = candidate.startMin - block.start
    const rightGap = block.end - candidate.endMin
    const totalNewGaps = leftGap + rightGap

    let smallGapPenalty = 0
    if (leftGap > 0 && leftGap < MIN_USABLE_GAP) smallGapPenalty += (MIN_USABLE_GAP - leftGap)
    if (rightGap > 0 && rightGap < MIN_USABLE_GAP) smallGapPenalty += (MIN_USABLE_GAP - rightGap)

    const adjustedDenominator = totalNewGaps + smallGapPenalty
    if (adjustedDenominator <= 0) return PDR_CAP

    return Math.min(gapFilled / adjustedDenominator, PDR_CAP)
  }

  _normalizePDR(pdr: number) {
    return Math.min(1.0, Math.log(1 + pdr) / Math.log(1 + this.config.PDR_CAP))
  }

  _computeAdjacencyBonus(candidate: any, bookings: any[]) {
    const { GRID_STEP } = this.config
    for (const b of bookings) {
      if (b.endMin === candidate.startMin) return 1.0
      if (candidate.endMin === b.startMin) return 1.0
      if (Math.abs(b.endMin - candidate.startMin) <= GRID_STEP) return 0.5
      if (Math.abs(candidate.endMin - b.startMin) <= GRID_STEP) return 0.5
    }
    return 0.0
  }

  _normalizeEarliness(startMin: number, shiftStart: number, shiftEnd: number) {
    const range = shiftEnd - shiftStart
    if (range <= 0) return 0.5
    return 1.0 - ((startMin - shiftStart) / range)
  }

  _computeFragmentationPenalty(candidate: any, block: any) {
    const { MIN_USABLE_GAP } = this.config
    const leftGap = candidate.startMin - block.start
    const rightGap = block.end - candidate.endMin

    let penalty = 0.0
    if (leftGap > 0 && leftGap < MIN_USABLE_GAP) penalty += 0.5
    if (rightGap > 0 && rightGap < MIN_USABLE_GAP) penalty += 0.5
    return penalty
  }

  _determineSuggestionCount(bookingCount: number, shiftEndMin: number, dateStr: string) {
    if (isToday(dateStr)) {
      const remaining = shiftEndMin - nowMinutes()
      if (remaining < 90) return 3
    }

    if (bookingCount >= 8) return 3
    if (bookingCount >= 4) return 4
    return 5
  }
}

export const bookingEngine = new SmartBookingEngine()
