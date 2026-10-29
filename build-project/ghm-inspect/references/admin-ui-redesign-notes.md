# Admin Control-Center Redesign Notes

The administrator experience uses a **friendly local grocery operations** visual system: deep market green anchors navigation and action states, warm yellow is reserved for primary actions and attention cues, and soft off-white backgrounds keep dense operational content calm.

The redesigned dashboard groups work into an overview, order queue, catalogue health, people records, and seller desk. The overview prioritizes action-required orders, seller checks, stock attention, and direct links to delivery, verification, and live-record workspaces. Order status changes, seller approvals or rejections, catalogue removal confirmation, and protected-route sign-in access remain available in the UI.

Validation completed: TypeScript compilation and the automated test suite both pass. The unauthenticated dashboard route renders a stable sign-in gate rather than attempting early navigation; the authenticated dashboard uses the shared administrator context after login. The managed preview also confirms that the direct dashboard entry state renders without a runtime error.
