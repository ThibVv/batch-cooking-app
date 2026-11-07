import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const { erreur } = await searchParams;
  return <LoginForm linkError={erreur === "lien"} />;
}
