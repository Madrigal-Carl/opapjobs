import { Head } from '@inertiajs/react';
import {
    Bookmark,
    Search,
    SearchX,
    ShieldCheck,
    UserSearch,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AvailabilityBadge } from '@/components/dashboard/badges';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { SummaryStat } from '@/components/dashboard/summary-stat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/pagination';
import {
    APPLICANTS_PER_PAGE,
    getApplicantPage,
    getApplicantSectors,
    getApplicantSummary,
} from '@/data/selectors';
import { candidates } from '@/routes/dashboard';
import type { Pathway } from '@/types/agency';
import { DashboardPage } from '@/components/dashboard/page';

type PathwayFilter = Pathway | 'all';

export default function DashboardCandidates() {
    const [keyword, setKeyword] = useState('');
    const [pathway, setPathway] = useState<PathwayFilter>('all');
    const [sector, setSector] = useState('all');
    const [page, setPage] = useState(1);
    const [saved, setSaved] = useState<number[]>([]);

    useEffect(() => {
        setPage(1);
    }, [keyword, pathway, sector]);

    const results = getApplicantPage({
        q: keyword,
        pathway,
        sector,
        page,
        perPage: APPLICANTS_PER_PAGE,
    });

    const summary = getApplicantSummary({ q: keyword, pathway, sector });
    const sectors = getApplicantSectors();
    const isFiltered =
        keyword.trim() !== '' || pathway !== 'all' || sector !== 'all';

    const resetFilters = () => {
        setKeyword('');
        setPathway('all');
        setSector('all');
        setPage(1);
    };

    const toggleSave = (id: number, name: string) => {
        setSaved((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );
        toast.success(
            saved.includes(id)
                ? `${name} removed from saved candidates.`
                : `${name} saved.`,
        );
    };

    return (
        <>
            <Head title="Candidates" />

            <DashboardPage>
                <DashboardPageHeader
                    title="Candidates"
                    subtitle="Find experienced Filipino professionals for your open roles."
                    actions={
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy)]">
                            <ShieldCheck
                                className="size-4 text-[var(--teal)]"
                                aria-hidden="true"
                            />
                            Verified profiles
                        </span>
                    }
                />

                <div
                    className="flex flex-wrap gap-2"
                    aria-label="Candidate totals"
                >
                    <SummaryStat label="profiles" value={summary.total} />
                    <SummaryStat label="landbased" value={summary.landbased} />
                    <SummaryStat label="seabased" value={summary.seabased} />
                    <SummaryStat label="saved" value={saved.length} />
                </div>

                <Card>
                    <CardContent className="flex flex-col gap-4 pt-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative min-w-56 flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    type="search"
                                    value={keyword}
                                    onChange={(event) =>
                                        setKeyword(event.target.value)
                                    }
                                    placeholder="Search by name, role, skills or location"
                                    aria-label="Search candidates"
                                    className="pl-9"
                                    data-testid="input-candidate-search"
                                />
                            </div>
                            <Select
                                value={pathway}
                                onValueChange={(value) =>
                                    setPathway(value as PathwayFilter)
                                }
                            >
                                <SelectTrigger
                                    className="w-40"
                                    aria-label="Filter by pathway"
                                    data-testid="select-candidate-pathway"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All pathways
                                    </SelectItem>
                                    <SelectItem value="landbased">
                                        Landbased
                                    </SelectItem>
                                    <SelectItem value="seabased">
                                        Seabased
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={sector} onValueChange={setSector}>
                                <SelectTrigger
                                    className="w-56"
                                    aria-label="Filter by role"
                                    data-testid="select-candidate-sector"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {sectors.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span className="text-sm text-[var(--slate)] tabular-nums">
                                {results.total}{' '}
                                {results.total === 1 ? 'profile' : 'profiles'}
                            </span>
                        </div>

                        {results.items.length ? (
                            <Table data-testid="table-candidates">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Candidate</TableHead>
                                        <TableHead>Specialty</TableHead>
                                        <TableHead>Experience</TableHead>
                                        <TableHead>Skills</TableHead>
                                        <TableHead>Availability</TableHead>
                                        <TableHead className="text-right">
                                            Save
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.items.map((applicant) => (
                                        <TableRow
                                            key={applicant.id}
                                            data-testid={`row-candidate-${applicant.id}`}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="size-9">
                                                        <AvatarFallback className="bg-[var(--teal-light)] font-semibold text-[var(--navy)]">
                                                            {applicant.initials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p
                                                            className="truncate font-semibold text-[var(--navy)]"
                                                            title={
                                                                applicant.name
                                                            }
                                                        >
                                                            {applicant.name}
                                                        </p>
                                                        <p
                                                            className="truncate text-xs text-[var(--slate)]"
                                                            title={
                                                                applicant.location
                                                            }
                                                        >
                                                            {applicant.location}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className="block max-w-44 truncate text-sm"
                                                    title={applicant.role}
                                                >
                                                    {applicant.role}
                                                </span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {applicant.experience}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex max-w-64 flex-wrap gap-1">
                                                    {applicant.skills.map(
                                                        (skill) => (
                                                            <span
                                                                key={skill}
                                                                className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-xs text-[var(--navy)]"
                                                            >
                                                                {skill}
                                                            </span>
                                                        ),
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <AvailabilityBadge
                                                    availability={
                                                        applicant.availability
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant={
                                                        saved.includes(
                                                            applicant.id,
                                                        )
                                                            ? 'secondary'
                                                            : 'ghost'
                                                    }
                                                    size="sm"
                                                    onClick={() =>
                                                        toggleSave(
                                                            applicant.id,
                                                            applicant.name,
                                                        )
                                                    }
                                                    aria-pressed={saved.includes(
                                                        applicant.id,
                                                    )}
                                                    aria-label={`${
                                                        saved.includes(
                                                            applicant.id,
                                                        )
                                                            ? 'Unsave'
                                                            : 'Save'
                                                    } ${applicant.name}`}
                                                    data-testid={`button-save-candidate-${applicant.id}`}
                                                >
                                                    <Bookmark
                                                        aria-hidden="true"
                                                        className={
                                                            saved.includes(
                                                                applicant.id,
                                                            )
                                                                ? 'fill-[var(--teal)] text-[var(--teal)]'
                                                                : undefined
                                                        }
                                                    />
                                                    {saved.includes(
                                                        applicant.id,
                                                    )
                                                        ? 'Saved'
                                                        : 'Save'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <DashboardEmptyState
                                icon={isFiltered ? SearchX : UserSearch}
                                title="No candidates found"
                                message={
                                    isFiltered
                                        ? 'No matching profiles. Try another skill, role or pathway.'
                                        : 'Candidate profiles will appear here once added to the pool.'
                                }
                                onReset={isFiltered ? resetFilters : undefined}
                            />
                        )}

                        <Pagination
                            page={results.page}
                            totalPages={results.totalPages}
                            label="Candidates pagination"
                            testIdPrefix="candidates-pagination"
                            onPageChange={setPage}
                        />
                    </CardContent>
                </Card>

                <p className="text-sm text-[var(--slate)]">
                    Candidate profiles are sample workspace data. Applicant
                    contact details are shared only after an introduction.
                </p>
            </DashboardPage>
        </>
    );
}

DashboardCandidates.layout = {
    breadcrumbs: [
        {
            title: 'Candidates',
            href: candidates(),
        },
    ],
};
