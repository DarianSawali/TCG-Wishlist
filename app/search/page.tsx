import SearchClient from "./search-client";

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  return <SearchClient initialQuery={query} />;
}
