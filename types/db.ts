export type Campaign = {
  id: string;
  owner_id: string;
  slug: string;
  business_name: string;
  logo_url: string | null;
  google_review_url: string;
  instagram_url: string;
  win_ratio: number;
  created_at: string;
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
  event_type: "visit" | "play";
  did_review: boolean;
  did_follow: boolean;
  result: "win" | "lose" | null;
  prize: string | null;
  created_at: string;
};

