<?php

namespace Database\Seeders;

use App\Models\JobCategory;
use App\Models\JobSubcategory;
use Illuminate\Database\Seeder;

class JobCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            'landbased' => [
                'Construction' => [
                    'Electrician', 'Welder / Fabricator', 'Mason / Plasterer', 'Carpenter',
                    'Heavy Equipment Operator', 'Steel Fixer', 'Painter / Finisher',
                ],
                'Healthcare' => [
                    'Registered Nurse', 'Licensed Practical Nurse', 'Caregiver',
                    'Medical Technician', 'Pharmacist Assistant', 'Dental Hygienist',
                ],
                'Hospitality' => [
                    'Hotel Front Desk Associate', 'Housekeeping Attendant', 'Waiter / Waitress',
                    'Sous Chef', 'Barista', 'Pastry Chef',
                ],
                'Domestic Work' => [
                    'Household Helper', 'Cook / Cookery Assistant', 'Elderly Care Assistant', 'Nanny / Child Carer',
                ],
                'Manufacturing' => [
                    'Production Line Worker', 'Machine Operator', 'Quality Inspector',
                    'Assembler', 'Forklift Operator', 'Warehouse Team Lead',
                ],
                'Information Technology' => [
                    'IT Support Technician', 'Systems Administrator', 'Software Developer', 'Data Analyst', 'Help Desk Agent',
                ],
                'Engineering' => [
                    'Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer', 'Site Supervisor', 'QA / QC Inspector',
                ],
                'Logistics' => [
                    'Warehouse Team Lead', 'Dispatcher', 'Truck Driver', 'Inventory Controller', 'Customer Service Representative',
                ],
                'Agriculture' => [
                    'Farm Hand', 'Agronomist', 'Poultry Worker', 'Greenhouse Technician',
                ],
            ],
            'seabased' => [
                'Deck Department' => [
                    'Master / Captain', 'Chief Officer', 'Second Officer', 'Third Officer', 'Deck Cadet',
                    'Bosun', 'Able Seaman', 'Ordinary Seaman', 'Chief Deckhand',
                ],
                'Engine Department' => [
                    'Chief Engineer', 'Second Engineer', 'Third Engineer', 'Fourth Engineer', 'Motorman / Oiler',
                    'Oiler', 'Diesel Mechanic', 'Engine Cadet', 'Electrician',
                ],
                'Catering / Hotel Department' => [
                    'Chief Cook', 'Cook', 'Galley Utility', 'Steward / Stewardess', 'Barman', 'Waiter',
                ],
                'Cruise Ship Crew' => [
                    'Cruise Ship Nurse', 'Guest Relations Officer', 'Entertainment Technician', 'Retail Shop Associate', 'Kids Club Attendant',
                ],
                'Offshore' => [
                    'Offshore Welder', 'Roustabout', 'Rig Medic', 'HSE Officer', 'Offshore Technician',
                ],
                'Cargo Operations' => [
                    'Tally Clerk', 'Storekeeper', 'Cargo Coordinator', 'Container Supervisor',
                ],
                'Marine Engineering Support' => [
                    'Marine Electrician', 'Marine Engineer Cadet', 'Diesel Generator Technician', 'Hydraulic Technician',
                ],
            ],
        ];

        foreach ($categories as $pathway => $categoryGroups) {
            foreach (array_keys($categoryGroups) as $categoryOrder => $categoryName) {
                $category = JobCategory::updateOrCreate(
                    ['pathway' => $pathway, 'category_name' => $categoryName],
                    ['sort_order' => $categoryOrder],
                );

                foreach ($categoryGroups[$categoryName] as $subcategoryOrder => $subcategoryName) {
                    JobSubcategory::updateOrCreate(
                        ['job_category_id' => $category->id, 'subcategory_name' => $subcategoryName],
                        ['sort_order' => $subcategoryOrder],
                    );
                }
            }
        }
    }
}
