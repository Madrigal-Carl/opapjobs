import { getCategories, getSubCategories } from '@/data/job-categories';
import type {
    JobCategoryRecord,
    JobSubcategoryRecord,
    Pathway,
} from '../types';

/**
 * Categories and subcategories (§6), seeded from `data/job-categories.ts`.
 *
 * Both are the only lookups maintained in the app, so both carry
 * `sort_order` and `deleted_at` and support rename, reorder and archive.
 */

let categoryId = 1;
let subcategoryId = 1;

export function seedCategories(): JobCategoryRecord[] {
    categoryId = 1;

    const records: JobCategoryRecord[] = [];

    for (const pathway of ['landbased', 'seabased'] as Pathway[]) {
        for (const name of getCategories(pathway)) {
            records.push({
                id: categoryId++,
                pathway,
                categoryName: name,
                sortOrder: records.filter((r) => r.pathway === pathway).length,
                deletedAt: null,
            });
        }
    }

    // One archived category so the collapsed "Archived (n)" section is not
    // empty on first load.
    records.push({
        id: categoryId++,
        pathway: 'landbased',
        categoryName: 'Marine Construction',
        sortOrder: 99,
        deletedAt: '2026-07-04T09:00:00.000Z',
    });

    return records;
}

export function seedSubcategories(): JobSubcategoryRecord[] {
    subcategoryId = 1;

    const categories = seedCategories().filter((c) => c.deletedAt === null);
    const records: JobSubcategoryRecord[] = [];

    for (const category of categories) {
        for (const [index, name] of getSubCategories(
            category.pathway,
            category.categoryName,
        ).entries()) {
            records.push({
                id: subcategoryId++,
                jobCategoryId: category.id,
                subcategoryName: name,
                sortOrder: index,
                deletedAt: null,
            });
        }
    }

    return records;
}

/** Next free ids for records the console creates at runtime. */
export function nextCategoryId(): number {
    return categoryId++;
}

export function nextSubcategoryId(): number {
    return subcategoryId++;
}
