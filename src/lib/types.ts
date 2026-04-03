// Database types for F.Golf

export interface Profile {
  id: string
  display_name: string | null
  email: string | null
  handicap_self_reported: number | null
  handicap_estimated: number | null
  handicap_estimated_driving: number | null
  handicap_estimated_irons: number | null
  handicap_estimated_wedges: number | null
  primary_launch_monitor: string | null
  home_facility: string | null
  account_tier: 'free' | 'premium' | 'trial'
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  onboarding_completed: boolean
  chat_queries_used_this_month: number
  sessions_count: number
  last_session_at: string | null
  optimal_cadence_days: number | null
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  goal_type: 'break_score' | 'lower_handicap' | 'more_distance' | 'more_consistent' | 'specific_metric' | 'other'
  goal_text: string | null
  target_value: number | null
  status: 'active' | 'completed' | 'abandoned' | 'paused'
  ai_redirected: boolean
  redirect_reason: string | null
  created_at: string
  completed_at: string | null
}

export interface Session {
  id: string
  user_id: string
  session_date: string
  session_type: 'practice' | 'fitting' | 'lesson' | 'round'
  facility_name: string | null
  launch_monitor_type: string | null
  total_shots: number
  user_notes: string | null
  raw_file_path: string | null
  ocr_confidence: number | null
  data_confirmed: boolean
  created_at: string
}

export interface Shot {
  id: string
  session_id: string
  user_id: string
  club_type: string
  club_name: string | null
  ball_speed_mph: number | null
  club_speed_mph: number | null
  smash_factor: number | null
  launch_angle_deg: number | null
  spin_rate_rpm: number | null
  spin_axis_deg: number | null
  carry_yards: number | null
  total_yards: number | null
  offline_yards: number | null
  apex_height_yards: number | null
  attack_angle_deg: number | null
  club_path_deg: number | null
  face_angle_deg: number | null
  face_to_path_deg: number | null
  descent_angle_deg: number | null
  shot_number: number | null
  created_at: string
}

export interface SessionAnalysis {
  id: string
  session_id: string
  user_id: string
  primary_insight: string | null
  recommended_action: string | null
  expected_outcome: string | null
  full_analysis: Record<string, unknown> | null
  fingerprint_snapshot: Record<string, unknown> | null
  handicap_estimate_snapshot: Record<string, unknown> | null
  model_used: string | null
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  topic: string | null
  session_id: string | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  context_refs: Record<string, unknown> | null
  model_used: string | null
  tokens_used: number | null
  created_at: string
}

export interface Recommendation {
  id: string
  user_id: string
  session_id: string | null
  recommendation_type: string
  recommendation_text: string
  target_metric: string | null
  target_metric_baseline: number | null
  target_metric_goal: number | null
  user_acknowledged: boolean
  outcome_measured_at: string | null
  outcome_metric_value: number | null
  outcome_improved: boolean | null
  outcome_delta: number | null
  created_at: string
}

export interface FingerprintSnapshot {
  id: string
  user_id: string
  session_id: string | null
  fingerprint_data: FingerprintData
  estimated_handicap: number | null
  created_at: string
}

export interface FingerprintData {
  driving_distance: number
  driving_accuracy: number
  iron_consistency: number
  wedge_control: number
  launch_efficiency: number
  spin_control: number
  [key: string]: number
}

export interface Benchmark {
  id: string
  handicap_min: number
  handicap_max: number
  club_type: string
  metric_name: string
  p25: number | null
  p50: number | null
  p75: number | null
  sample_size: number | null
  source: 'published' | 'platform_computed'
}

// Club types for selection
export const CLUB_TYPES = [
  { value: 'driver', label: 'Driver' },
  { value: '3w', label: '3 Wood' },
  { value: '5w', label: '5 Wood' },
  { value: '7w', label: '7 Wood' },
  { value: '4h', label: '4 Hybrid' },
  { value: '5h', label: '5 Hybrid' },
  { value: '3i', label: '3 Iron' },
  { value: '4i', label: '4 Iron' },
  { value: '5i', label: '5 Iron' },
  { value: '6i', label: '6 Iron' },
  { value: '7i', label: '7 Iron' },
  { value: '8i', label: '8 Iron' },
  { value: '9i', label: '9 Iron' },
  { value: 'pw', label: 'PW' },
  { value: 'gw', label: 'GW' },
  { value: 'sw', label: 'SW' },
  { value: 'lw', label: 'LW' },
] as const

export const LAUNCH_MONITORS = [
  { value: 'trackman', label: 'TrackMan' },
  { value: 'foresight', label: 'Foresight / GCQuad' },
  { value: 'uneekor', label: 'Uneekor' },
  { value: 'garmin_r10', label: 'Garmin Approach R10' },
  { value: 'rapsodo', label: 'Rapsodo MLM2 Pro' },
  { value: 'flightscope', label: 'FlightScope Mevo+' },
  { value: 'other', label: 'Other' },
] as const

export const GOAL_OPTIONS = [
  { value: 'break_score', label: 'Break a score (100, 90, 80, 70)', placeholder: 'What score?' },
  { value: 'lower_handicap', label: 'Lower my handicap', placeholder: 'Target handicap?' },
  { value: 'more_distance', label: 'Hit it further', placeholder: '' },
  { value: 'more_consistent', label: 'Get more consistent', placeholder: '' },
  { value: 'specific_metric', label: 'Improve a specific metric', placeholder: 'Which metric?' },
  { value: 'other', label: 'Something else', placeholder: 'Tell us more' },
] as const
