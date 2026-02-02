export type CampaignObjective = "google" | "instagram" | "facebook" | "tiktok";

export type Campaign = {
  id: string;
  user_id: string;
  slug: string;
  business_name: string;
  business_type?: string | null;
  address?: string | null;
  logo_url: string | null;
  objective?: CampaignObjective | null;
  link?: string | null;
  is_active?: boolean | null;
  created_at: string;
  google_review_url?: string | null;
  instagram_url?: string | null;
  win_ratio?: number | null;
};

export type Reward = {
  id: string;
  campaign_id: string;
  label: string;
  created_at: string;
};

export type Participation = {
  id: string;
  campaign_id: string;
  event_type: "visit" | "action" | "play";
  did_review: boolean;
  did_follow: boolean;
  result: "win" | "lose" | null;
  prize: string | null;
  client_token?: string | null;
  review_validated_at?: string | null;
  created_at: string;
};

export type Wheel = {
  id: string;
  campaign_id: string;
  is_active: boolean;
  base_participations: number;
  created_at: string;
};

export type WheelItem = {
  id: string;
  wheel_id: string;
  label: string;
  kind: "win" | "lose";
  max_wins: number;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Spin = {
  id: string;
  campaign_id: string;
  wheel_id: string;
  wheel_item_id: string;
  participation_id: string | null;
  client_token: string;
  result: "win" | "lose";
  created_at: string;
};

export type RewardClaim = {
  id: string;
  spin_id: string;
  status: "pending" | "claimed" | "canceled";
  claimed_at: string | null;
  created_at: string;
};


