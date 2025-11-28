# Airtable Schema Update - Pricing Suggestions from Reviews

## Overview
This update adds the ability for users to suggest pricing information when submitting reviews. These suggestions are stored separately and require admin approval before updating the site's actual pricing information.

## Reviews Table - New Fields Required

Add the following fields to the **Reviews** table:

### 1. SuggestedPricingType
- **Field Type**: Single select
- **Options**:
  - `free` (完全無料)
  - `partially_paid` (一部有料プランあり)
  - `fully_paid` (有料サービス)
- **Allow empty**: Yes
- **Description**: ユーザーが提案する料金体系

### 2. SuggestedHasFreeTrial
- **Field Type**: Checkbox
- **Description**: ユーザーが無料お試しありと提案

### 3. SuggestedRegistrationRequired
- **Field Type**: Checkbox
- **Description**: ユーザーが会員登録必要と提案

## Sites Table - Existing Fields (No Changes Needed)

The Sites table already has these fields (added in Phase 6):
- `PricingType` (Single select: free/partially_paid/fully_paid/unknown)
- `HasFreeTrial` (Checkbox)
- `RegistrationRequired` (Checkbox)

## Implementation Flow

1. **User submits review** → Pricing suggestions stored in `SuggestedPricingType`, `SuggestedHasFreeTrial`, `SuggestedRegistrationRequired` fields
2. **Admin reviews suggestion** → Can see suggested pricing info in admin interface
3. **Admin approves** → Manually updates the Site's pricing fields OR uses admin interface to apply suggestion
4. **Site pricing updated** → The Site record's `PricingType`, `HasFreeTrial`, `RegistrationRequired` fields are updated

## Manual Setup Instructions

### Step 1: Open Airtable
1. Go to https://airtable.com
2. Open the base: `appwdYkA3Fptn9TtN`

### Step 2: Add Fields to Reviews Table
1. Click on the "Reviews" table
2. Click the "+" button to add a new field

#### Add SuggestedPricingType:
- Field name: `SuggestedPricingType`
- Field type: Single select
- Options:
  - `free`
  - `partially_paid`
  - `fully_paid`
- Click "Create field"

#### Add SuggestedHasFreeTrial:
- Field name: `SuggestedHasFreeTrial`
- Field type: Checkbox
- Click "Create field"

#### Add SuggestedRegistrationRequired:
- Field name: `SuggestedRegistrationRequired`
- Field type: Checkbox
- Click "Create field"

### Step 3: Verify
After adding the fields, verify that:
- All three fields appear in the Reviews table
- The field types are correct
- The field names match exactly (case-sensitive)

## Admin Interface (Next Step)

After updating the Airtable schema, we need to create an admin interface that:
1. Shows pending reviews with pricing suggestions
2. Displays the suggested pricing information
3. Provides a button to "Apply Pricing Suggestion" which:
   - Updates the Site record with the suggested pricing
   - Marks the suggestion as reviewed/applied

This will be implemented in Phase 7.

## Testing

After schema update, test with:
1. Submit a review with pricing information
2. Check that the review record in Airtable has the suggested pricing fields populated
3. Verify the data is stored correctly

## Notes

- All pricing suggestion fields are optional (users can skip them)
- Multiple users can suggest pricing for the same site
- Admins can choose which suggestion to apply or manually set pricing
- The "Suggested" prefix distinguishes user suggestions from admin-approved site pricing
