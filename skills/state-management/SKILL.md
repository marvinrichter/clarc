---
name: state-management
description: "Frontend state management patterns: TanStack Query for server state, Zustand for client state, URL state, form state with React Hook Form, and when to use what. Prevents over-engineering and the most common state bugs."
---

# State Management Skill

## When to Activate

- Deciding where to put state in a React/Vue/Svelte app
- Server data is going stale or showing inconsistent values
- Global state causing unnecessary re-renders
- Form state is getting complex
- URL not reflecting application state (back button broken)
- Migrating server data out of Zustand into TanStack Query to eliminate manual cache sync
- Adding optimistic updates to a mutation so the UI responds instantly before the server confirms

---

## State Type Decision Tree

```
Is this data from the server?
  YES → TanStack Query (not a state library)
  NO  → Is it needed in multiple components far apart in the tree?
          YES → Zustand (global client state)
          NO  → Is it navigation/filter/search state that should survive a refresh?
                  YES → URL state (search params)
                  NO  → Is it form input?
                          YES → React Hook Form
                          NO  → useState / useReducer (local)
```

**The most common mistake:** putting server data in Zustand. Use TanStack Query instead.

---

## Server State: TanStack Query

```typescript
// queries/users.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys: structured, predictable, invalidation-friendly
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Fetch a single user
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => api.get<User>(`/users/${id}`),
    staleTime: 5 * 60 * 1000,  // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000,    // Keep in cache 10 minutes after unused
  });
}

// Fetch list with filters
export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => api.get<User[]>('/users', { params: filters }),
    placeholderData: keepPreviousData,  // Don't flash empty on filter change
  });
}

// Mutation with optimistic update
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; update: Partial<User> }) =>
      api.patch<User>(`/users/${data.id}`, data.update),

    onMutate: async ({ id, update }) => {
      // Cancel in-flight queries for this user
      await queryClient.cancelQueries({ queryKey: userKeys.detail(id) });

      // Snapshot previous value for rollback
      const previous = queryClient.getQueryData<User>(userKeys.detail(id));

      // Optimistically update
      queryClient.setQueryData<User>(userKeys.detail(id), (old) =>
        old ? { ...old, ...update } : old
      );

      return { previous };
    },

    onError: (_, { id }, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(userKeys.detail(id), context.previous);
      }
    },

    onSettled: (_, __, { id }) => {
      // Always refetch after mutation (source of truth from server)
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// Usage in component
function UserProfile({ id }: { id: string }) {
  const { data: user, isLoading, error } = useUser(id);
  const { mutate: updateUser, isPending } = useUpdateUser();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <form onSubmit={() => updateUser({ id, update: { name: 'New Name' } })}>
      {/* ... */}
    </form>
  );
}
```

---

## Global Client State: Zustand

Only for state that is truly client-side and needed across the app (UI state, user preferences, shopping cart before checkout).

```typescript
// stores/ui.ts
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

interface UIStore {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setTheme: (theme: UIStore['theme']) => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        theme: 'system',
        toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
        setTheme: (theme) => set({ theme }),
      }),
      { name: 'ui-store' }   // persisted to localStorage
    )
  )
);

// Cart store (not persisted to server yet)
interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()((set, get) => ({
  items: [],
  addItem: (item) =>
    set(state => {
      const existing = state.items.find(i => i.id === item.id);
      if (existing) {
        return {
          items: state.items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),
  removeItem: (id) =>
    set(state => ({ items: state.items.filter(i => i.id !== id) })),
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
```

---

## URL State (nuqs / useSearchParams)

Use for: filters, pagination, search queries, active tabs — anything that should be bookmarkable.

```typescript
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs';

function UserList() {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [status, setStatus] = useQueryState('status');

  const { data } = useUsers({ page, search, status });

  return (
    <>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <select value={status ?? ''} onChange={e => setStatus(e.target.value || null)}>
        <option value="">All</option>
        <option value="active">Active</option>
      </select>
      {data?.map(user => <UserRow key={user.id} user={user} />)}
      <Pagination current={page} onChange={setPage} />
    </>
  );
}
// URL: /users?page=2&q=alice&status=active
// Back button works. Sharing link works. Refresh works.
```

---

## Form State: React Hook Form

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'member']),
});

type FormData = z.infer<typeof schema>;

function UserForm({ onSuccess }: { onSuccess: () => void }) {
  const { mutate: createUser, isPending } = useCreateUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'member' },
  });

  const onSubmit = (data: FormData) => {
    createUser(data, {
      onSuccess,
      onError: (err) => {
        // Map server errors back to fields
        if (err.field === 'email') {
          setError('email', { message: err.message });
        }
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      <button disabled={isPending}>Save</button>
    </form>
  );
}
```

---

## Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Server data in Zustand | Manual sync, stale data, double fetch | TanStack Query |
| `useEffect` to sync state | Infinite loops, race conditions | Derive from source of truth |
| Huge single global store | All components re-render on any change | Multiple small stores |
| Filters/search in local state | Back button breaks, can't share URL | URL state |
| Form state in useState | Manual validation, reset logic | React Hook Form |
| Prop drilling 5+ levels | Brittle, painful refactoring | Zustand or Context |

---

## Checklist

- [ ] Server data in TanStack Query (not Zustand)
- [ ] Query keys are structured and hierarchical (for precise invalidation)
- [ ] Mutations invalidate the right query keys in `onSettled`
- [ ] Optimistic updates implemented for snappy UX on common mutations
- [ ] URL reflects all filterable/paginated state
- [ ] Forms use React Hook Form + Zod schema validation
- [ ] Zustand stores are small and single-purpose (not one mega-store)
- [ ] DevTools enabled in development (TanStack Query DevTools, Zustand DevTools)
