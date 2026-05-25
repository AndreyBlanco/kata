import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import {
  ACTIVE_SCHOOL_YEAR,
  inferSchoolPeriodId,
  SCHOOL_PERIOD_SOURCE_URL,
  SCHOOL_PERIODS,
} from '@/lib/school-periods'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  return NextResponse.json({
    activeSchoolYear: ACTIVE_SCHOOL_YEAR,
    sourceUrl: SCHOOL_PERIOD_SOURCE_URL,
    defaultPeriodId: inferSchoolPeriodId(),
    periods: SCHOOL_PERIODS,
    maintenanceNote:
      'Las fechas oficiales se actualizan en lib/school-periods.ts con cada calendario MEP.',
  })
}
