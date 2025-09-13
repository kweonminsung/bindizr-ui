# DNS dashborad for SCG

A simple web interface for managing DNS zones and records.

## Getting Started

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Set up environment variables:**

    Create a `.env.local` file in the root of the project and add the following variables:

    ```
    NEXT_PUBLIC_API_TOKEN=your_api_token_here
    NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

## Dependencies

- [Node.js](https://nodejs.org) v20 or higher
- [Next.js](https://nextjs.org/) v15
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Sqlite3](https://sqlite.org/)
- [Bindizr](https://github.com/kweonminsung/bindizr)
