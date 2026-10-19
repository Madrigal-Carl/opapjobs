import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { jobs } from '@/routes/dashboard';

export default function JobPostUnavailable({ message }: { message: string }) {
    return (
        <main className="mx-auto flex max-w-xl flex-col gap-4 p-8">
            <Head title="Job posting unavailable" />
            <h1 className="text-xl font-semibold">Job posting unavailable</h1>
            <p role="alert">{message}</p>
            <Button asChild>
                <Link href={jobs()}>Back to jobs</Link>
            </Button>
        </main>
    );
}
