import type { Component } from 'vue'

export type TripStatus = 'draft' | 'published' | 'archived'

export type BudgetUnit = '元' | '万'

export interface TripFormData {
  title: string
  description: string
  year: string
  startDate: string
  endDate: string
  days: number | null
  nights: number | null
  status: TripStatus
  budgetPerPersonMin: number | null
  budgetPerPersonMax: number | null
  budgetUnit: BudgetUnit
  travelerCount: number | null
}

export interface TripStatusOption {
  label: string
  value: TripStatus
  icon: Component
}

export interface Trip {
  id?: string
  title: string
  description?: string
  year?: string
  startDate?: string
  endDate?: string
  days?: number
  status?: TripStatus
  budgetPerPersonMin?: number
  budgetPerPersonMax?: number
  budgetUnit?: BudgetUnit
  travelerCount?: number
}
