-- MySQL Schema for Project Manager SaaS
-- Multi-tenant architecture with row-level isolation
-- Compatible with phpMyAdmin

-- Create database (run this separately if needed)
-- CREATE DATABASE project_manager_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE project_manager_saas;

-- ============================================
-- TENANTS TABLE (for multi-tenancy)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    plan ENUM('free', 'starter', 'professional', 'enterprise') DEFAULT 'free',
    status ENUM('active', 'suspended', 'cancelled') DEFAULT 'active',
    max_users INT DEFAULT 10,
    max_projects INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_subdomain (subdomain),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USERS TABLE (authentication)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_email_tenant (email, tenant_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_email (email),
    INDEX idx_email_verification_token (email_verification_token),
    INDEX idx_password_reset_token (password_reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROFILES TABLE (user information)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id CHAR(36) PRIMARY KEY,
    tenant_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('active', 'on-hold', 'completed', 'archived') DEFAULT 'active',
    color VARCHAR(7) DEFAULT '#14b8a6',
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_created_by (created_by),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROJECT MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) NOT NULL,
    project_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_user (project_id, user_id),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_project_id (project_id),
    INDEX idx_user_id (user_id),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) NOT NULL,
    project_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('admin', 'member', 'viewer') DEFAULT 'member',
    status ENUM('pending', 'accepted', 'declined', 'expired') DEFAULT 'pending',
    invited_by CHAR(36),
    token CHAR(36) NOT NULL DEFAULT (UUID()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE SET NULL,
    UNIQUE KEY unique_project_email (project_id, email),
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_project_id (project_id),
    INDEX idx_email (email),
    INDEX idx_token (token),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) NOT NULL,
    project_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('todo', 'in-progress', 'review', 'done') DEFAULT 'todo',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    assignee_id CHAR(36),
    due_date TIMESTAMP NULL,
    tags JSON DEFAULT (JSON_ARRAY()),
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_project_id (project_id),
    INDEX idx_assignee_id (assignee_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TASK COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_comments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) NOT NULL,
    task_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TASK ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_attachments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) NOT NULL,
    task_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) NOT NULL,
    project_id CHAR(36) NOT NULL,
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id CHAR(36),
    entity_name VARCHAR(255),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
    INDEX idx_tenant_id (tenant_id),
    INDEX idx_project_id (project_id),
    INDEX idx_user_id (user_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- HELPER FUNCTIONS (MySQL 8.0+)
-- ============================================

-- Function to check if user is project member
DELIMITER //
CREATE FUNCTION IF NOT EXISTS is_project_member(
    p_user_id CHAR(36),
    p_project_id CHAR(36)
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count
    FROM project_members
    WHERE user_id = p_user_id AND project_id = p_project_id;
    RETURN v_count > 0;
END//
DELIMITER ;

-- Function to check if user has pending invitation
DELIMITER //
CREATE FUNCTION IF NOT EXISTS has_project_invitation(
    p_user_email VARCHAR(255),
    p_project_id CHAR(36)
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count
    FROM invitations
    WHERE LOWER(email) = LOWER(p_user_email)
    AND project_id = p_project_id
    AND status = 'pending'
    AND expires_at > NOW();
    RETURN v_count > 0;
END//
DELIMITER ;

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for projects with member count
CREATE OR REPLACE VIEW v_projects_with_stats AS
SELECT 
    p.*,
    COUNT(DISTINCT pm.user_id) as member_count,
    COUNT(DISTINCT t.id) as task_count,
    COUNT(DISTINCT CASE WHEN t.status != 'done' THEN t.id END) as active_task_count
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id;

-- ============================================
-- INITIAL DATA (Optional - for testing)
-- ============================================

-- Insert a default tenant (you can remove this in production)
-- INSERT INTO tenants (id, name, subdomain, plan, status) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default', 'professional', 'active');


