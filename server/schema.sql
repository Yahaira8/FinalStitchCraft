-- Replit Built-In PostgreSQL DDL Migration Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (Self-Contained Authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PATTERNS TABLE (Domain Content & Seed Data)
CREATE TABLE IF NOT EXISTS patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(150) NOT NULL,
  difficulty VARCHAR(30) CHECK (difficulty IN ('Beginner', 'Advanced Beginner', 'Intermediate', 'Advanced')),
  yarn_weight VARCHAR(50) NOT NULL,
  recommended_hook VARCHAR(10) NOT NULL,
  recommended_eye_size VARCHAR(10) NOT NULL,
  category VARCHAR(50) NOT NULL,
  instructions JSONB NOT NULL,
  video_url TEXT NOT NULL,
  image_urls TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. USER_PROJECTS TABLE (Primary CRUD Entity with Dynamic JSON map)
CREATE TABLE IF NOT EXISTS user_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
  project_name VARCHAR(150) NOT NULL,
  target_yarn VARCHAR(50) NOT NULL,
  target_hook VARCHAR(10) NOT NULL,
  target_eye_size VARCHAR(10) NOT NULL,
  -- Schema: {"part_name": {"current_row": 0, "total_rows": 15, "completed": false}}
  part_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_completion INT DEFAULT 0 CHECK (overall_completion BETWEEN 0 AND 100),
  status VARCHAR(20) DEFAULT 'In Progress' CHECK (status IN ('Planning', 'In Progress', 'Completed', 'Frogged')),
  personal_notes TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. USER_FAVORITES TABLE (Many-to-Many Relationship)
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_id UUID NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, pattern_id)
);

-- 5. COMMUNITY_POSTS TABLE (Finished Plushie Showcase Gallery)
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES patterns(id) ON DELETE SET NULL,
  custom_pattern_name VARCHAR(150),
  photo_data_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  yarn_used VARCHAR(80) DEFAULT 'Worsted (#4)',
  hook_used VARCHAR(20) DEFAULT '3.5mm',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. POST_LIKES TABLE (Community Post Hearts)
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 7. POST_COMMENTS TABLE (Community Post Comments)
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
