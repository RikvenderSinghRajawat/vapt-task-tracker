## Summary

### Branding & White-Labeling
- Dynamic theming system with per-tenant CSS variable injection
- Custom email domain and sender configuration
- Admin-configurable SMTP settings
- Unified header/footer branding components
- Language/locale preference persistence

### Subscription & Billing
- Multi-tier plan structure with feature-based access control
- Admin plan CRUD and per-tenant assignment
- Usage metering and soft/hard enforcement
- Stripe integration (customers, products, prices, checkout, webhooks)
- Invoice generation and payment history
- Role-based feature gating per schema

### AI Chat & Smart Inbox
- Real-time WebSocket chat with typing indicators and read receipts
- Smart Inbox with priority classification and agent assignment
- AI-driven reply suggestions and auto-routing rules
- Session management for customer support conversations

### Support Center
- Full CRUD support request system with file attachments (multer)
- Role-based access: user can create/view own requests, admin can manage all
- Admin panel with advanced filtering, assignment, status tracking
- Multi-category classification (bug, complaint, feature request, etc.)
- Comment/discussion thread system on each request
- Request lifecycle: open → in_progress → resolved → closed → reopened
- Automatic request ID generation (SR-XXXXX format)
- Soft delete and pagination support
