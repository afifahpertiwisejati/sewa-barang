export function useFormatters() {
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (isoDate: string): string => {
    if (!isoDate) return '-'
    const date = new Date(`${isoDate}T00:00:00`)
    if (Number.isNaN(date.getTime())) return isoDate
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  const formatDateRange = (startDate: string, endDate: string): string => {
    if (!startDate || !endDate) return '-'
    return `${formatDate(startDate)} – ${formatDate(endDate)}`
  }

  const calculateDurationDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return 0
    return diff === 0 ? 1 : diff
  }

  const getOffsetIsoDate = (daysFromToday = 0): string => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + daysFromToday)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return {
    formatRupiah,
    formatDate,
    formatDateRange,
    calculateDurationDays,
    getOffsetIsoDate,
  }
}
