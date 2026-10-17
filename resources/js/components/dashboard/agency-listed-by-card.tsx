import { BadgeCheck, Globe, Star, UsersRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Agency } from '@/types/agency';

/** Agency attribution with its logo, rating, licence, and available company facts. */
export function AgencyListedByCard({ agency }: { agency: Agency }) {
    const facts = [
        agency.license ? { label: 'DMW license', value: agency.license } : null,
        agency.yearsInOperation !== undefined
            ? {
                  label: 'Years in operation',
                  value: `${agency.yearsInOperation} years`,
              }
            : null,
        agency.size
            ? {
                  label: 'Agency size',
                  value: (
                      <span className="inline-flex items-center gap-1.5">
                          <UsersRound
                              className="size-4 text-[var(--teal)]"
                              aria-hidden="true"
                          />
                          {agency.size}
                      </span>
                  ),
              }
            : null,
    ].filter((fact) => fact !== null);

    return (
        <Card className="gap-0 rounded-xl border-[var(--line)] bg-white p-5 shadow-none">
            <CardContent className="px-0">
                <div className="flex items-center gap-4">
                    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-white">
                        {agency.logo ? (
                            <img
                                src={agency.logo}
                                alt={`${agency.name} logo`}
                                className="size-full object-contain p-1"
                            />
                        ) : (
                            <Globe
                                className="size-7 text-[var(--slate)]"
                                aria-hidden="true"
                            />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold tracking-wider text-[var(--teal)] uppercase">
                            Listed by
                        </p>
                        <h3 className="mt-0.5 font-serif text-xl font-bold break-words text-[var(--navy)]">
                            {agency.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                                className="flex gap-0.5"
                                aria-label="Five star rating"
                            >
                                {Array.from({ length: 5 }, (_, index) => (
                                    <Star
                                        key={index}
                                        className="size-3.5 fill-[var(--amber)] text-[var(--amber)]"
                                        aria-hidden="true"
                                    />
                                ))}
                            </span>
                            <span className="text-[13px] font-semibold text-[var(--navy)]">
                                {agency.rating}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-[var(--slate)]">
                                <BadgeCheck
                                    className="size-3.5 text-[var(--teal)]"
                                    aria-hidden="true"
                                />
                                Verified agency
                            </span>
                        </div>
                    </div>
                </div>
                {agency.description && (
                    <p className="mt-3 text-[13px] leading-relaxed text-[var(--slate)]">
                        {agency.description}
                    </p>
                )}
                {facts.length > 0 && (
                    <dl className="mt-4 grid grid-cols-1 gap-4 border-t border-[var(--line)] pt-4 sm:grid-cols-3">
                        {facts.map(({ label, value }) => (
                            <div key={label} className="min-w-0">
                                <dt className="text-[10px] font-semibold tracking-wide text-[#8a99a6] uppercase">
                                    {label}
                                </dt>
                                <dd className="mt-1 text-sm font-semibold break-words text-[var(--navy)]">
                                    {value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </CardContent>
        </Card>
    );
}
