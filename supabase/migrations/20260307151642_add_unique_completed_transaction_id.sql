CREATE UNIQUE INDEX idx_unique_completed_transaction_id
ON orders (transaction_id)
WHERE status = 'completed';
