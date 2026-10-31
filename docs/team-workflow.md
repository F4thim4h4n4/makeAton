# Team Workflow – Subscription Management System

## Branch Strategy

```
main
 └── develop
      ├── feature/catalog-pricing        (Member 1)
      ├── feature/subscriptions-auth     (Member 2)
      ├── feature/billing-payments       (Member 3)
      └── feature/dashboard-portal       (Member 4)
```

---

## Branch Roles

| Branch                        | Purpose                                                   |
|-------------------------------|-----------------------------------------------------------|
| `main`                        | Stable, deployable code only. Merged from `develop` after team review. |
| `develop`                     | Integration branch. All feature branches target this.    |
| `feature/catalog-pricing`     | Member 1: Products, variants, plans, pricing, taxes, discounts. |
| `feature/subscriptions-auth`  | Member 2: Authentication, roles, customers, quotations, subscription lifecycle. |
| `feature/billing-payments`    | Member 3: Invoices, payments, duplicate-prevention logic. |
| `feature/dashboard-portal`    | Member 4: Revenue dashboard, reports, customer self-service portal. |

---

## Initial Repository Setup (one-time, performed by the team lead)

```bash
# On GitHub: create the repository at https://github.com/new
# Then locally:

git remote add origin https://github.com/<org>/subscription-management-system.git

# Push the initial scaffold to main
git add .
git commit -m "chore: initial project scaffold"
git push -u origin main

# Create and push develop from main
git checkout -b develop
git push -u origin develop
```

---

## Each Member: Starting Your Feature Branch

```bash
# Make sure your local develop is up to date first
git checkout develop
git pull origin develop

# Create your feature branch
git checkout -b feature/<your-branch-name>

# Example for Member 1:
git checkout -b feature/catalog-pricing
```

---

## Daily Workflow

```bash
# 1. Start your day by pulling the latest changes from develop
git checkout develop
git pull origin develop

# 2. Rebase your feature branch onto the latest develop
git checkout feature/<your-branch>
git rebase develop

# 3. Work on your code, then stage and commit
git add .
git commit -m "feat(products): add Product Mongoose model"

# 4. Push your branch to GitHub
git push origin feature/<your-branch>
```

### Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

Types:  feat | fix | chore | docs | refactor | test | style
Scope:  products | auth | billing | dashboard | infra | etc.

Examples:
  feat(auth): implement JWT login endpoint
  fix(invoices): prevent duplicate invoice generation
  docs(api): add payment endpoints to api-contracts.md
  chore(deps): upgrade mongoose to 8.4.4
```

---

## Submitting a Feature via Pull Request

1. Push your feature branch: `git push origin feature/<your-branch>`
2. Open GitHub → **Pull Requests** → **New Pull Request**
3. Set **base** branch to `develop` and **compare** to your feature branch
4. Fill in the PR template:
   - What was implemented
   - How to test it
   - Any open questions or dependencies
5. Request a review from at least one other team member
6. Address review comments, then **Squash & Merge** into `develop`

---

## Merging develop → main (team lead)

After all features for a milestone are merged and tested in `develop`:

```bash
git checkout main
git pull origin main
git merge --no-ff develop -m "release: merge develop into main for milestone X"
git push origin main
```

---

## Conflict Resolution

If two members edit the same file:

```bash
# Rebase your branch onto the latest develop
git checkout feature/<your-branch>
git fetch origin
git rebase origin/develop

# Fix any conflicts in your editor, then:
git add <conflicted-file>
git rebase --continue

# Push (force is required after rebase)
git push --force-with-lease origin feature/<your-branch>
```

**Communicate in your team chat before editing shared files** (e.g. `backend/src/app.js`, `frontend/src/routes/AppRoutes.jsx`) to minimise conflicts.

---

## Module Ownership & Shared Files

| File                                   | Who may edit                        |
|----------------------------------------|-------------------------------------|
| `backend/src/app.js`                   | All – coordinate before changing    |
| `frontend/src/routes/AppRoutes.jsx`    | All – coordinate before changing    |
| `frontend/src/routes/navItems.js`      | All – coordinate before changing    |
| `backend/src/models/*`                 | Owner of the relevant feature branch|
| `backend/src/controllers/*`            | Owner of the relevant feature branch|
| `backend/src/routes/*`                 | Owner of the relevant feature branch|
| `frontend/src/pages/*`                 | Owner of the relevant feature branch|
| `docs/*`                               | All – keep updated as features land |

---

## Do Not

- ❌ Push directly to `main`
- ❌ Push directly to `develop` (always use a PR)
- ❌ Commit `backend/.env` or any file containing real credentials
- ❌ Force-push to `develop` or `main`
- ❌ Leave long-lived feature branches unmerged (rebase frequently)
