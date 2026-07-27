-- Add templateId column to landing_pages table
ALTER TABLE landing_pages ADD COLUMN template_id VARCHAR(50) AFTER content_json;
