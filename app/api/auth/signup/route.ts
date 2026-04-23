import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SignupBody = {
  email?: string;
  password?: string;
  emailRedirectTo?: string;
};

export async function POST(req: Request) {
  let body: SignupBody | undefined;
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  const emailRedirectTo = body?.emailRedirectTo;

  if (!email || !password) {
    return NextResponse.json({ error: "missing_email_or_password" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });

    if (error) {
      console.error("[signup][server] signUp error", {
        message: error.message,
        code: (error as unknown as { code?: string }).code,
        status: (error as unknown as { status?: number }).status,
        email,
      });
      return NextResponse.json(
        {
          error: "signup_failed",
          message: "Une erreur technique est survenue lors de la création du compte.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        user: data.user ?? null,
        session: data.session ?? null,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[signup][server] unexpected error", e);
    return NextResponse.json(
      {
        error: "signup_failed",
        message: "Une erreur technique est survenue lors de la création du compte.",
      },
      { status: 500 }
    );
  }
}

