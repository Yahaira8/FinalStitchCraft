export type Difficulty = 'Beginner' | 'Advanced Beginner' | 'Intermediate' | 'Advanced';

export type ProjectStatus = 'Planning' | 'In Progress' | 'Completed' | 'Frogged';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string | null;
  created_at?: string;
}

export interface Pattern {
  id: string;
  title: string;
  difficulty: Difficulty;
  yarn_weight: string;
  recommended_hook: string;
  recommended_eye_size: string;
  category: string;
  instructions: Record<string, string[]>;
  video_url: string;
  image_urls: string[];
  created_at?: string;
}

export interface PartProgressItem {
  current_row: number;
  total_rows: number;
  completed: boolean;
}

export interface UserProject {
  id: string;
  user_id: string;
  pattern_id: string | null;
  project_name: string;
  target_yarn: string;
  target_hook: string;
  target_eye_size: string;
  part_progress: Record<string, PartProgressItem>;
  overall_completion: number;
  status: ProjectStatus;
  personal_notes: string;
  updated_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  body: string;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  username: string;
  pattern_id: string | null;
  pattern_title?: string | null;
  custom_pattern_name: string | null;
  photo_data_url: string;
  caption: string;
  yarn_used: string;
  hook_used: string;
  like_count: number;
  liked_by_me: boolean;
  comments: PostComment[];
  created_at: string;
}

export type RuntimeMode = 'replit-pg' | 'aistudio-local';
