# Setting up OPAP Jobs

Follow these steps in order to run the project on a new computer. It runs on Docker with Laravel Sail, so you don't need to install PHP, Node or PostgreSQL.

- [Part 1: Install the tools](#part-1-install-the-tools)
- [Part 2: Set up the project](#part-2-set-up-the-project)
- [Part 3: Start and stop the project each day](#part-3-start-and-stop-the-project-each-day)
- [Part 4: Send real email (optional)](#part-4-send-real-email-optional)
- [Part 5: Run the tests and code checks](#part-5-run-the-tests-and-code-checks)
- [Other useful commands](#other-useful-commands)
- [Troubleshooting](#troubleshooting)
- [Staging and production gaps](#staging-and-production-gaps)

## Part 1: Install the tools

Follow the section for your operating system, then go to Part 2.

### Windows

**1. Install Ubuntu on WSL2**

1. Open the Start menu, type `PowerShell`, right-click **Windows PowerShell** and choose **Run as administrator**.
2. Run:

    ```powershell
    wsl --install -d Ubuntu
    ```

3. Restart your computer if it asks you to.
4. Open the Start menu, type `Ubuntu` and open it.
5. When asked, create a username and password. The password stays invisible as you type, which is normal.

**2. Install Docker Desktop**

1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Open Docker Desktop and wait until it shows that the engine is running.
3. Go to **Settings > Resources > WSL Integration**, turn on **Ubuntu**, then click **Apply & restart**.

**3. Check that it works**

Run this in the **Ubuntu** terminal:

```bash
docker run --rm hello-world
```

You should see `Hello from Docker!`.

> **Windows users:** run every command in the rest of this guide in the **Ubuntu** terminal, not PowerShell or Git Bash.

### macOS

1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Open Docker Desktop and wait until it shows that the engine is running.
3. Press `Cmd + Space`, type `Terminal` and press Enter.
4. Run:

    ```bash
    docker run --rm hello-world
    ```

You should see `Hello from Docker!`.

### Linux

1. Install [Docker Engine](https://docs.docker.com/engine/install/) with the Compose plugin.
2. Open a terminal and allow your user to run Docker:

    ```bash
    sudo usermod -aG docker "$USER"
    ```

3. Log out and back in.
4. Run:

    ```bash
    docker run --rm hello-world
    ```

You should see `Hello from Docker!`.

## Part 2: Set up the project

Do this once on each computer. Run all of these commands in your terminal (the **Ubuntu** terminal on Windows).

### Step 1: Free up the ports

The project uses ports 80, 5173 and 5432. If you run Laragon, XAMPP, a local PostgreSQL or another Vite project, stop it now.

If you can't stop it, finish Step 3 and then follow [Use different ports](#use-different-ports).

### Step 2: Download the project

```bash
mkdir -p ~/code
cd ~/code
git clone https://github.com/Madrigal-Carl/opapjobs.git
cd opapjobs
```

If Git asks you to sign in, you need access to the repository first.

> **Windows users:** keep the project in `~/code`. Don't put it under `/mnt/c/`, because it will be very slow and hot reload can stop working.

### Step 3: Create your settings file

```bash
cp .env.docker.example .env
```

This creates `.env`, which holds your own settings. Git ignores this file, so never commit it.

### Step 4: Install the PHP packages

Copy all of this, including both lines:

```bash
docker run --rm -u "$(id -u):$(id -g)" -v "$(pwd):/var/www/html" -w /var/www/html \
    laravelsail/php84-composer:latest composer install --ignore-platform-reqs
```

This takes a few minutes. When it's done, you have a `vendor` folder.

### Step 5: Create the `sail` shortcut

On **Windows or Linux**:

```bash
echo "alias sail='./vendor/bin/sail'" >> ~/.bashrc
source ~/.bashrc
```

On **macOS**:

```bash
echo "alias sail='./vendor/bin/sail'" >> ~/.zshrc
source ~/.zshrc
```

You only do this once. From now on, you can type `sail` from inside the project folder.

### Step 6: Start the containers

```bash
sail up -d
```

The first run builds the app image and can take 10 minutes or more. Later starts take seconds.

Check that it worked:

```bash
sail ps
```

You should see `laravel.test` and `pgsql`, both with a status of `Up`.

### Step 7: Generate the app key

```bash
sail artisan key:generate
```

### Step 8: Create the database tables and demo data

```bash
sail artisan migrate --seed
```

This creates the tables, then loads the roles, job categories and demo data.

### Step 9: Install the frontend packages

```bash
sail npm install
```

### Step 10: Start Vite

```bash
sail npm run dev
```

Leave this terminal open. Vite has to keep running while you work, and it updates the page as you edit the code.

### Step 11: Open the app

1. Open <http://localhost> in your browser.
2. Click **Sign in**.
3. Sign in with one of these accounts. The password for all of them is `password`.

| Email                     | Role         |
| ------------------------- | ------------ |
| `superadmin@example.test` | Superadmin   |
| `admin@example.test`      | Agency admin |
| `agency1@example.test`    | Agency staff |
| `applicant@example.test`  | Applicant    |

Your setup is finished.

## Part 3: Start and stop the project each day

### Start working

1. Open Docker Desktop and wait until the engine is running.
2. Open your terminal and run:

    ```bash
    cd ~/code/opapjobs
    sail up -d
    sail npm run dev
    ```

3. Open <http://localhost>.

### Stop working

1. In the terminal running Vite, press `Ctrl + C`.
2. Run:

    ```bash
    sail stop
    ```

Your data stays in the database for next time.

### Get the latest code

After you pull changes, update the packages and database:

```bash
git pull
sail composer install
sail npm install
sail artisan migrate
```

## Part 4: Send real email (optional)

By default, emails aren't sent. They're written to `storage/logs/laravel.log`, where you can copy verification and password reset links.

Follow these steps to send real email through Gmail.

**1. Create a Gmail App Password**

1. Turn on [2-Step Verification](https://myaccount.google.com/signinoptions/twosv) for your Google account.
2. Go to [App Passwords](https://myaccount.google.com/apppasswords) and create one.
3. Copy the password it shows you. You'll use it in the next step in place of your normal Gmail password.

**2. Add the settings to `.env`**

1. Open the file:

    ```bash
    nano .env
    ```

2. Find the lines that start with `MAIL_` and replace them with these, using your own Gmail address and App Password:

    ```dotenv
    MAIL_MAILER=smtp
    MAIL_SCHEME=null
    MAIL_HOST=smtp.gmail.com
    MAIL_PORT=587
    MAIL_USERNAME="you@gmail.com"
    MAIL_PASSWORD="your-16-character-app-password"
    MAIL_FROM_ADDRESS="you@gmail.com"
    MAIL_FROM_NAME="${APP_NAME}"
    ```

3. Press `Ctrl + O`, then `Enter` to save, and `Ctrl + X` to close.

Keep `MAIL_SCHEME=null` for port 587. Don't change it to `tls`, because Laravel only accepts `smtp` or `smtps`.

**3. Reload the settings**

```bash
sail artisan config:clear
```

**4. Send a test email**

Replace `you@example.com` with your own address, then run:

```bash
sail artisan tinker --execute 'Illuminate\Support\Facades\Mail::raw("SMTP test", fn ($message) => $message->to("you@example.com")->subject("OPAP SMTP test"));'
```

Check that address's inbox, and its spam folder, for a message called **OPAP SMTP test**.

**5. Start the queue worker when you need staff account emails**

Emails to new agency staff go through a queue, and Sail doesn't process it on its own. Open a **new terminal** and run:

```bash
cd ~/code/opapjobs
sail artisan queue:listen --tries=1 --timeout=0
```

Leave it running. If you change `.env` later, press `Ctrl + C` and start it again.

## Part 5: Run the tests and code checks

Open a **new terminal**, because Vite is using the first one, and go to the project:

```bash
cd ~/code/opapjobs
```

**Run the PHP tests**

```bash
sail test
```

These use a temporary in-memory database, so they don't touch your demo data.

**Run the JavaScript tests**

```bash
sail npm test
```

**Run the code checks**

```bash
sail composer lint
sail composer types:check
sail npm run check
sail npm run types:check
```

`sail composer lint` fixes PHP formatting by itself. To fix frontend lint and formatting problems, run `sail npm run check:fix`.

**Run everything CI runs**

```bash
sail composer ci:check
```

## Other useful commands

Run these from inside the project folder.

| Task                                          | Command                             |
| --------------------------------------------- | ----------------------------------- |
| Run one test file                             | `sail test tests/Feature/Public/JobBrowseTest.php` |
| Run new migrations                            | `sail artisan migrate`              |
| Reset the database and demo data (deletes all data) | `sail artisan migrate:fresh --seed` |
| Open the database shell                       | `sail psql`                         |
| Open a shell in the container                 | `sail shell`                        |
| Remove the containers                         | `sail down`                         |
| Remove the containers **and the database**    | `sail down -v`                      |

To connect a desktop database client, use host `localhost`, port `5432`, database `opapjobs`, username `sail` and password `password`.

### Use different ports

Use this if another program has to keep a port.

1. Open the file:

    ```bash
    nano .env
    ```

2. Change the ports you need to. If you change `APP_PORT`, add the same port to `APP_URL`:

    ```dotenv
    APP_URL=http://localhost:8088
    APP_PORT=8088
    VITE_PORT=5174
    FORWARD_DB_PORT=5433
    ```

3. Press `Ctrl + O`, then `Enter` to save, and `Ctrl + X` to close.
4. If the containers are already running, apply the change:

    ```bash
    sail up -d
    ```

Then open the app at your new address, such as <http://localhost:8088>.

## Troubleshooting

| What you see                                                  | What to do                                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `sail: command not found`                                     | Go back to [Step 5](#step-5-create-the-sail-shortcut), or use `./vendor/bin/sail` instead.                    |
| `Unsupported operating system`                                | You're in PowerShell or Git Bash. Open the Ubuntu terminal.                                                   |
| `Cannot connect to the Docker daemon`                         | Open Docker Desktop and wait for the engine to start. On Windows, also check WSL Integration is on for Ubuntu. |
| `port is already allocated` or `address already in use`       | Stop the program using that port, or [use different ports](#use-different-ports).                             |
| `password authentication failed for user "sail"`              | The database has older credentials. Run `sail down -v` (this deletes the database), `sail up -d`, then `sail artisan migrate --seed`. |
| `could not translate host name "pgsql"`                       | You ran it outside the containers. Use `sail artisan`, not `php artisan`.                                     |
| `Unable to locate file in Vite manifest`                      | Run `sail npm run dev`.                                                                                       |
| The page has no styling                                       | Check that `sail npm run dev` is running. If you stopped Vite, delete the `public/hot` file.                  |
| Changes don't appear without a refresh                        | Check that Vite is running. On Windows, keep the project in `~/code`, not `/mnt/c/`.                          |
| `Cannot find module` for a native binding                     | `node_modules` came from another computer. Delete the folder and run `sail npm install`.                      |
| Demo accounts don't work                                      | Check that `.env` has `APP_ENV=local`, then run `sail artisan db:seed`.                                       |
| `Permission denied` writing to `storage` or `bootstrap/cache` | Run `sudo chown -R "$(id -u):$(id -g)" storage bootstrap/cache`.                                              |
| `535 Username and Password not accepted` from Gmail           | Use an [App Password](#part-4-send-real-email-optional), not your normal password.                            |
| New staff never receive their email                           | Start the [queue worker](#part-4-send-real-email-optional).                                                   |

## Staging and production gaps

This setup is for development only: Sail runs `php artisan serve` with no TLS, and its database password is public. Before a real deployment, these are still open:

- **No superadmin outside `local`.** Only the demo seeder creates one, and there's no agreed way to create the first one yet.
- **No production container or deployment config.**
- **No supervised queue worker.** Without one, staff account emails never go out.
- **No production email provider.** A personal Gmail account has low sending limits.
- **No backups** for PostgreSQL or `storage/app/private`, where applicant documents are stored.
