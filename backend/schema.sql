CREATE DATABASE IF NOT EXISTS `ai_interview_platform`;
USE `ai_interview_platform`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) DEFAULT '',
  `college` VARCHAR(255) DEFAULT '',
  `branch` VARCHAR(255) DEFAULT '',
  `graduation_year` INT NULL,
  `skills` JSON NULL,
  `profile_image` TEXT NULL,
  `linkedin` VARCHAR(255) DEFAULT '',
  `github` VARCHAR(255) DEFAULT '',
  `detected_role` VARCHAR(100) DEFAULT 'Software Engineer',
  `resume_url` TEXT NULL,
  `resume_file_name` VARCHAR(255) DEFAULT '',
  `resume_uploaded_at` DATETIME NULL,
  `role` ENUM('candidate', 'admin') DEFAULT 'candidate',
  `is_verified` TINYINT(1) DEFAULT 0,
  `resume_uploaded` TINYINT(1) DEFAULT 0,
  `aptitude_completed` TINYINT(1) DEFAULT 0,
  `coding_completed` TINYINT(1) DEFAULT 0,
  `interview_completed` TINYINT(1) DEFAULT 0,
  `reset_password_token` VARCHAR(255) NULL,
  `reset_password_expires` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `otp` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `otp_code` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `is_used` TINYINT(1) DEFAULT 0,
  `last_sent_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_otp_email` (`email`),
  INDEX `idx_otp_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `resume_analyses` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `resume_score` INT DEFAULT 0,
  `ats_score` INT DEFAULT 0,
  `summary` TEXT NULL,
  `detected_skills` JSON NULL,
  `missing_skills` JSON NULL,
  `strengths` JSON NULL,
  `weaknesses` JSON NULL,
  `experience` JSON NULL,
  `education` JSON NULL,
  `projects` JSON NULL,
  `detected_role` VARCHAR(100) DEFAULT 'Software Engineer',
  `recommended_roles` JSON NULL,
  `analysis_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `aptitude_questions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `question` TEXT NOT NULL,
  `options` JSON NOT NULL,
  `correct_answer` VARCHAR(255) NOT NULL,
  `category` ENUM('Quantitative', 'Logical', 'Verbal') NOT NULL,
  `difficulty` ENUM('Easy', 'Medium', 'Hard') NOT NULL,
  `marks` INT DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_apt_cat_diff` (`category`, `difficulty`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `aptitude_results` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `score` INT DEFAULT 0,
  `total_questions` INT DEFAULT 15,
  `correct_answers` INT DEFAULT 0,
  `wrong_answers` INT DEFAULT 0,
  `percentage` INT DEFAULT 0,
  `status` ENUM('PASS', 'FAIL') DEFAULT 'FAIL',
  `completed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `aptitude_attempt_questions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `attempt_id` BIGINT UNSIGNED NOT NULL,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`attempt_id`) REFERENCES `aptitude_results`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `aptitude_questions`(`id`) ON DELETE CASCADE,
  INDEX `idx_attempt_qs` (`attempt_id`, `question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `coding_questions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `difficulty` ENUM('Easy', 'Medium', 'Hard') NOT NULL,
  `category` VARCHAR(100) DEFAULT 'DSA',
  `role` VARCHAR(100) DEFAULT 'Software Engineer',
  `tags` JSON NULL,
  `input_format` TEXT NOT NULL,
  `output_format` TEXT NOT NULL,
  `constraints` TEXT NOT NULL,
  `sample_input` TEXT NOT NULL,
  `sample_output` TEXT NOT NULL,
  `starter_code` JSON NULL,
  `test_cases` JSON NOT NULL,
  `hidden_test_cases` JSON NOT NULL,
  `language` VARCHAR(100) DEFAULT 'cpp,java,python,javascript',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_coding_diff` (`difficulty`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `coding_results` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `language` VARCHAR(50) NULL,
  `submitted_code` MEDIUMTEXT NULL,
  `passed_test_cases` INT DEFAULT 0,
  `total_test_cases` INT DEFAULT 0,
  `score` INT DEFAULT 0,
  `status` ENUM('PASS', 'FAIL', 'Compilation Error') DEFAULT 'FAIL',
  `execution_time` VARCHAR(50) DEFAULT '',
  `memory` VARCHAR(50) DEFAULT '',
  `submitted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_user_question` (`user_id`, `question_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `coding_questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `interview_sessions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `session_id` VARCHAR(100) NULL,
  `started_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `ended_at` DATETIME NULL,
  `duration` INT DEFAULT 0,
  `status` ENUM('IN_PROGRESS', 'COMPLETED', 'ABANDONED') DEFAULT 'IN_PROGRESS',
  `conversation_history` JSON NULL,
  `overall_score` INT DEFAULT 0,
  `total_questions` INT DEFAULT 0,
  `total_questions_asked` INT DEFAULT 0,
  `meaningful_answers_count` INT DEFAULT 0,
  `category_scores` JSON NULL,
  `strengths` JSON NULL,
  `weaknesses` JSON NULL,
  `improvement_suggestions` JSON NULL,
  `recommended_learning_path` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `interview_questions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `question` TEXT NOT NULL,
  `category` ENUM('Introduction', 'Technical', 'Behavioral', 'Project', 'Closing', 'Follow-up') NOT NULL,
  `difficulty` ENUM('Easy', 'Medium', 'Hard') DEFAULT 'Medium',
  `is_answered` TINYINT(1) DEFAULT 0,
  `prep_seconds` INT DEFAULT 30,
  `answer_seconds` INT DEFAULT 120,
  `order_num` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON DELETE CASCADE,
  INDEX `idx_iq_session_order` (`session_id`, `order_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `interview_answers` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `question_id` BIGINT UNSIGNED NOT NULL,
  `transcript` TEXT NOT NULL,
  `audio_url` TEXT NULL,
  `communication_score` INT DEFAULT 0,
  `technical_score` INT DEFAULT 0,
  `confidence_score` INT DEFAULT 0,
  `fluency_score` INT DEFAULT 0,
  `relevance_score` INT DEFAULT 0,
  `grammar_score` INT DEFAULT 0,
  `problem_solving_score` INT DEFAULT 0,
  `structure_score` INT DEFAULT 0,
  `overall_score` INT DEFAULT 0,
  `feedback` TEXT NULL,
  `follow_up_question` TEXT NULL,
  `suggested_approach` TEXT NULL,
  `answer_seconds` INT DEFAULT 0,
  `rerecord_count` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_session_question` (`session_id`, `question_id`),
  FOREIGN KEY (`session_id`) REFERENCES `interview_sessions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `interview_questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
