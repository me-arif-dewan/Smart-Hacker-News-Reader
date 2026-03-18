CREATE DATABASE IF NOT EXISTS hn_reader;
USE hn_reader;

CREATE TABLE IF NOT EXISTS bookmarks (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  story_id      INT NOT NULL UNIQUE,
  title         VARCHAR(500) NOT NULL,
  url           VARCHAR(1000),
  author        VARCHAR(255),
  score         INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);