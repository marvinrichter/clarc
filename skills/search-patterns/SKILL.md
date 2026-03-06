---
name: search-patterns
description: "Search implementation patterns: full-text search with Postgres tsvector, Typesense for production search, Elasticsearch for complex analytics, faceted search, autocomplete, typo tolerance, vector/semantic search, and relevance tuning."
---

# Search Patterns Skill

## When to Activate

- Adding search to any part of your product
- Users are complaining about poor search results
- Autocomplete / typeahead needed
- Faceted filtering (by category, price, date, etc.)
- Semantic/AI search over your content
- Migrating away from LIKE queries in Postgres

---

## Technology Selection

| Need | Solution | When |
|------|----------|------|
| Simple search, small dataset (<100k) | Postgres full-text (tsvector) | Already on Postgres |
| Great UX, typo tolerance, fast setup | Typesense | Most product search |
| Complex analytics, large scale | Elasticsearch / OpenSearch | When you need aggregations + scale |
| Semantic / meaning-based search | pgvector or Typesense | RAG, "find similar" |
| E-commerce with merchandising | Algolia | When budget allows |

---

## Pattern 1: Postgres Full-Text Search (no extra infra)

```sql
-- Add tsvector column (auto-updated via trigger)
ALTER TABLE products ADD COLUMN search_vector TSVECTOR;

-- Generate from multiple fields with weights
-- 'A' = highest weight (title), 'B' = medium (tags), 'C' = lowest (description)
UPDATE products
SET search_vector =
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(tags::text, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C');

-- Keep updated automatically
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.tags::text, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_vector_update
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- GIN index for performance
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Query: ranked results
SELECT
  id, name, description,
  ts_rank_cd(search_vector, query) AS rank
FROM products, plainto_tsquery('english', $1) query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;

-- Autocomplete with prefix matching
SELECT name FROM products
WHERE search_vector @@ to_tsquery('english', $1 || ':*')  -- prefix match
LIMIT 5;
```

```typescript
// TypeScript query helper
async function searchProducts(q: string, limit = 20) {
  return db.execute(sql`
    SELECT id, name, description,
           ts_rank_cd(search_vector, query) AS rank
    FROM products, plainto_tsquery('english', ${q}) query
    WHERE search_vector @@ query
    ORDER BY rank DESC
    LIMIT ${limit}
  `);
}
```

---

## Pattern 2: Typesense (recommended for product search)

Typesense: open-source, typo-tolerant, fast, easy to self-host or use Typesense Cloud.

```typescript
// search/typesense.ts
import Typesense from 'typesense';

const client = new Typesense.Client({
  nodes: [{ host: process.env.TYPESENSE_HOST!, port: 443, protocol: 'https' }],
  apiKey: process.env.TYPESENSE_API_KEY!,
  connectionTimeoutSeconds: 2,
});

// Schema definition
const productSchema = {
  name: 'products',
  fields: [
    { name: 'id', type: 'string' as const },
    { name: 'name', type: 'string' as const },
    { name: 'description', type: 'string' as const, optional: true },
    { name: 'price', type: 'float' as const },
    { name: 'category', type: 'string' as const, facet: true },   // facetable
    { name: 'tags', type: 'string[]' as const, facet: true },
    { name: 'inStock', type: 'bool' as const, facet: true },
    { name: 'rating', type: 'float' as const },
    { name: 'createdAt', type: 'int64' as const },  // Unix timestamp for sorting
    { name: 'embedding', type: 'float[]' as const, num_dim: 1536, optional: true },
  ],
  default_sorting_field: 'rating',
};

// Index a document
async function indexProduct(product: Product) {
  await client.collections('products').documents().upsert({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    tags: product.tags,
    inStock: product.stock > 0,
    rating: product.rating,
    createdAt: Math.floor(product.createdAt.getTime() / 1000),
  });
}

// Search with facets and filters
async function search(params: {
  q: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
}) {
  const filterParts: string[] = [];
  if (params.category) filterParts.push(`category:=${params.category}`);
  if (params.inStock !== undefined) filterParts.push(`inStock:=${params.inStock}`);
  if (params.minPrice !== undefined) filterParts.push(`price:>=${params.minPrice}`);
  if (params.maxPrice !== undefined) filterParts.push(`price:<=${params.maxPrice}`);

  return client.collections('products').documents().search({
    q: params.q || '*',
    query_by: 'name,description,tags',
    query_by_weights: '3,1,2',      // name most important
    filter_by: filterParts.join(' && ') || undefined,
    facet_by: 'category,tags,inStock',
    sort_by: params.q === '' ? 'rating:desc' : '_text_match:desc,rating:desc',
    page: params.page ?? 1,
    per_page: 24,
    highlight_full_fields: 'name,description',
    typo_tokens_threshold: 1,       // allow 1 typo
    num_typos: 2,
  });
}
```

---

## Pattern 3: Faceted Search UI

```typescript
// components/SearchPage.tsx
function SearchPage() {
  const [q, setQ] = useQueryState('q', parseAsString.withDefault(''));
  const [category, setCategory] = useQueryState('category');
  const [minPrice, setMinPrice] = useQueryState('minPrice', parseAsFloat);
  const [maxPrice, setMaxPrice] = useQueryState('maxPrice', parseAsFloat);
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  const { data } = useQuery({
    queryKey: ['search', { q, category, minPrice, maxPrice, page }],
    queryFn: () => search({ q, category, minPrice, maxPrice, page }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="grid grid-cols-[240px_1fr] gap-6">
      {/* Facet sidebar */}
      <aside>
        <FacetGroup
          title="Category"
          facets={data?.facet_counts?.find(f => f.field_name === 'category')?.counts}
          selected={category}
          onSelect={setCategory}
        />
        <PriceRangeFacet
          min={minPrice}
          max={maxPrice}
          onChange={(min, max) => { setMinPrice(min); setMaxPrice(max); }}
        />
      </aside>

      {/* Results */}
      <main>
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} />
        <ResultGrid hits={data?.hits} />
        <Pagination
          total={data?.found}
          page={page}
          perPage={24}
          onChange={setPage}
        />
      </main>
    </div>
  );
}
```

---

## Keeping Search Index in Sync

```typescript
// sync/search-sync.ts — keep Typesense in sync with Postgres

// Option 1: Event-driven (recommended) — sync after every write
export async function onProductSaved(product: Product) {
  await indexProduct(product);
}

export async function onProductDeleted(productId: string) {
  await client.collections('products').documents(productId).delete();
}

// Option 2: Full re-index (for schema changes or initial setup)
async function reindexAll() {
  const batchSize = 100;
  let offset = 0;

  while (true) {
    const products = await db.query.products.findMany({
      limit: batchSize,
      offset,
      orderBy: asc(productsTable.id),
    });

    if (products.length === 0) break;

    // Typesense bulk import
    await client.collections('products').documents().import(
      products.map(toSearchDocument),
      { action: 'upsert', batch_size: 100 }
    );

    offset += batchSize;
    console.log(`Indexed ${offset} products`);
  }
}
```

---

## Semantic Search (hybrid text + vector)

```typescript
// Combine BM25 (keyword) + vector (semantic) using Typesense built-in hybrid
async function semanticSearch(q: string) {
  const embedding = await embed(q);

  return client.collections('products').documents().search({
    q,
    query_by: 'name,description,embedding',
    vector_query: `embedding:([${embedding.join(',')}], k:50)`,
    // Typesense automatically combines text + vector with RRF
  });
}
```

---

## Checklist

- [ ] Search query debounced in UI (300ms) — don't fire on every keystroke
- [ ] Facet counts shown even for zero-result combinations (disabled state)
- [ ] URL reflects search state (q, filters, page) — back button works
- [ ] Empty state handled gracefully (no results message + suggestions)
- [ ] Typo tolerance enabled (essential for product names)
- [ ] Search index updated on every product write (event-driven sync)
- [ ] Re-index job available for schema migrations
- [ ] Search analytics collected (top queries, zero-result queries)
- [ ] Index schema versioned — breaking changes require new collection + swap
