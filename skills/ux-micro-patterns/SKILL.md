---
name: ux-micro-patterns
description: "UX micro-patterns for every product state: Empty States, Loading States (skeleton screens, spinners, optimistic UI), Error States, Success States, Confirmation Dialogs, Onboarding Flows, and Progressive Disclosure. These patterns apply to every feature — done wrong, they're the biggest source of user confusion."
origin: ECC
---

# UX Micro-Patterns Skill

## When to Activate

- Implementing any feature that loads, mutates, or can fail
- Designing empty list states, zero-data dashboards
- Building forms with validation and submission states
- Adding confirmation to destructive actions
- Onboarding new users to a feature
- Deciding between spinner vs. skeleton screen

---

## Pattern 1: Empty States

An empty state is not an error — it's an opportunity to guide users.

```
Bad empty state:   "No results found."
Good empty state:  [Illustration] + Headline + Why it's empty + Primary action
```

```tsx
// components/EmptyState.tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto gap-4">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-surface-overlay flex items-center justify-center text-text-secondary">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex gap-2">
          {action && (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Usage: three distinct contexts
<EmptyState
  icon={<InboxIcon />}
  title="No notifications yet"
  description="When someone mentions you or comments on your work, it'll show up here."
/>

<EmptyState
  icon={<SearchIcon />}
  title="No results for &ldquo;{query}&rdquo;"
  description="Try different keywords or remove filters."
  action={{ label: 'Clear filters', onClick: clearFilters }}
/>

<EmptyState
  icon={<FolderIcon />}
  title="Create your first project"
  description="Projects help you organize your work and collaborate with your team."
  action={{ label: 'New project', onClick: openCreateModal }}
  secondaryAction={{ label: 'Import existing', onClick: openImport }}
/>
```

**Empty state content rules:**
- Title: describes the state, not the action ("No projects yet", not "Projects")
- Description: explains why + what to do
- Action: one clear primary CTA — never two equal CTAs
- Illustration: optional but effective; avoid generic stock art

---

## Pattern 2: Loading States

### Skeleton Screens (preferred over spinners for content)

```tsx
// Skeleton: mirrors the shape of the content that's loading
// Rule: use skeleton when load time > 300ms or content has known structure

function ProjectCardSkeleton() {
  return (
    <div className="p-4 border border-border rounded-lg space-y-3 animate-pulse">
      {/* Header: avatar + name */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-surface-overlay" />
        <div className="h-4 w-32 rounded bg-surface-overlay" />
      </div>
      {/* Body: two lines of text */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-surface-overlay" />
        <div className="h-3 w-3/4 rounded bg-surface-overlay" />
      </div>
      {/* Footer */}
      <div className="h-3 w-24 rounded bg-surface-overlay" />
    </div>
  );
}

// Usage with TanStack Query
function ProjectList() {
  const { data: projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {projects?.map(p => <ProjectCard key={p.id} project={p} />)}
    </div>
  );
}
```

### Spinner: when to use it

```tsx
// Use spinner for:
// - Actions (button submit, page transitions)
// - Short loads (<300ms expected)
// - When content shape is unknown

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return (
    <svg
      className={`${sizeClass} animate-spin text-current`}
      fill="none" viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
```

### Optimistic UI (fastest perceived performance)

```tsx
// Update UI before server confirms — roll back on error
function TodoItem({ todo }: { todo: Todo }) {
  const { mutate: toggleTodo } = useMutation({
    mutationFn: (id: string) => api.patch(`/todos/${id}/toggle`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previous = queryClient.getQueryData<Todo[]>(['todos']);

      // Optimistically flip the checkbox
      queryClient.setQueryData<Todo[]>(['todos'], old =>
        old?.map(t => t.id === id ? { ...t, done: !t.done } : t)
      );
      return { previous };
    },
    onError: (_, __, context) => {
      // Roll back if server rejected
      queryClient.setQueryData(['todos'], context?.previous);
      toast.error('Failed to update');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => toggleTodo(todo.id)}
      />
      <span className={todo.done ? 'line-through text-text-secondary' : ''}>
        {todo.text}
      </span>
    </label>
  );
}
```

---

## Pattern 3: Error States

```tsx
// Three levels of error granularity

// 1. Field-level error (form validation)
<div>
  <input aria-invalid={!!error} aria-describedby="email-error" ... />
  {error && (
    <p id="email-error" className="text-sm text-error mt-1" role="alert">
      {error.message}
    </p>
  )}
</div>

// 2. Component-level error (query failed)
function ProjectList() {
  const { data, error, refetch } = useProjects();

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircleIcon className="w-8 h-8 text-error" />
        <p className="text-sm text-text-secondary">
          Failed to load projects. {error.message}
        </p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  // ...
}

// 3. Page-level error (route/boundary)
// In Next.js: error.tsx catches unhandled errors in a route segment
// app/dashboard/error.tsx
'use client';
export default function DashboardError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-text-secondary max-w-md text-center">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

---

## Pattern 4: Success States

```tsx
// Inline success (after form submit)
function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const { mutate } = useMutation({ onSuccess: () => setSubmitted(true) });

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircleIcon className="w-10 h-10 text-success" />
        <h3 className="font-semibold">Message sent!</h3>
        <p className="text-sm text-text-secondary">
          We'll get back to you within 24 hours.
        </p>
      </div>
    );
  }
  return <form onSubmit={...}>...</form>;
}

// Toast notifications (transient, non-blocking)
// Use for: mutations that succeed, background operations, non-critical info
// Do NOT use for: errors that need action, important info they might miss
import { toast } from 'sonner';

onSuccess: () => toast.success('Project created'),
onError: () => toast.error('Failed to create project. Try again.'),
```

---

## Pattern 5: Confirmation Dialogs (Destructive Actions)

```tsx
// Rule: confirm before any action that is hard or impossible to reverse
// Delete, disconnect, cancel subscription, overwrite data

function DeleteProjectButton({ projectId, projectName }: Props) {
  const [open, setOpen] = useState(false);
  const { mutate: deleteProject, isPending } = useDeleteProject();

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete project
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{projectName}&rdquo;?</DialogTitle>
            <DialogDescription>
              This will permanently delete the project and all its data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={isPending}
              onClick={() => deleteProject(projectId, { onSuccess: () => setOpen(false) })}
            >
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Confirmation dialog rules:**
- Title: names the specific thing being deleted ("Delete 'My Project'?", not "Delete?")
- Description: what happens + irreversibility ("cannot be undone")
- Cancel: always on the left, always the default focused element
- Confirm: right, danger variant, exact same wording as the trigger button
- Never auto-submit on Enter — require deliberate click

---

## Pattern 6: Progressive Disclosure

Show only what's needed; reveal more on demand.

```tsx
// "Show advanced options" — reveals expert controls without cluttering default UI
function CreateProjectForm() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <form>
      {/* Always visible: core fields */}
      <Input label="Project name" name="name" />
      <Textarea label="Description" name="description" />

      {/* Progressive disclosure: advanced settings */}
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        aria-expanded={showAdvanced}
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <ChevronIcon className={showAdvanced ? 'rotate-90' : ''} aria-hidden />
        Advanced settings
      </button>

      {showAdvanced && (
        <div className="space-y-4 border-l-2 border-border pl-4">
          <Select label="Visibility" name="visibility" />
          <Input label="Custom domain" name="domain" />
        </div>
      )}

      <Button type="submit">Create project</Button>
    </form>
  );
}
```

---

## Decision Table

| Situation | Pattern |
|-----------|---------|
| List has no items yet | EmptyState with primary CTA |
| Search returned nothing | EmptyState with "clear filters" action |
| Content loading > 300ms | Skeleton screen |
| Button action in progress | Button with spinner + `aria-busy` |
| Toggle / checkbox | Optimistic UI |
| Data fetch failed | Inline error + retry button |
| Form submit failed | Field errors + top-level summary |
| Mutation succeeded | Toast (transient) or inline success |
| Destructive action | Confirmation dialog first |
| Complex form | Progressive disclosure for advanced fields |

---

## Checklist

- [ ] Every list has an empty state (not just blank space)
- [ ] Every async operation has a loading state (skeleton or spinner)
- [ ] Every error has a retry mechanism
- [ ] Success is acknowledged (toast or inline state change)
- [ ] Destructive actions guarded by confirmation dialog
- [ ] Confirmation dialogs name the specific item being affected
- [ ] No spinner shown for optimistic actions that should feel instant
- [ ] Progressive disclosure used for forms with >6 fields
- [ ] Error messages say what happened AND what to do (not just "Error")
