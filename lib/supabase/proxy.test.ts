import { NextRequest, NextResponse } from "next/server";
import { describe, expect, test } from "vitest";
import { carryAuth, nextWithAuth } from "./proxy";

// Os cabeçalhos que o @supabase/ssr entrega junto com os cookies de sessão
const cacheHeaders = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

const sessionCookie = {
  name: "sb-ref-auth-token",
  value: "base64-novo",
  options: { path: "/", sameSite: "lax" as const, httpOnly: false },
};

describe("nextWithAuth", () => {
  test("grava os cookies renovados e proíbe cache na resposta", () => {
    const request = new NextRequest("https://mybooks.app/inicio");
    const response = nextWithAuth(request, [sessionCookie], cacheHeaders);

    expect(response.cookies.get("sb-ref-auth-token")?.value).toBe(
      "base64-novo",
    );
    expect(response.headers.get("cache-control")).toBe(
      cacheHeaders["Cache-Control"],
    );
    expect(response.headers.get("expires")).toBe("0");
  });

  test("a página renderizada já vê a sessão nova no pedido", () => {
    const request = new NextRequest("https://mybooks.app/inicio");
    nextWithAuth(request, [sessionCookie], cacheHeaders);
    expect(request.cookies.get("sb-ref-auth-token")?.value).toBe("base64-novo");
  });
});

describe("carryAuth", () => {
  test("o redirecionamento leva os cookies e o bloqueio de cache", () => {
    const request = new NextRequest("https://mybooks.app/inicio");
    const renewed = nextWithAuth(request, [sessionCookie], cacheHeaders);
    const redirect = carryAuth(
      renewed,
      NextResponse.redirect("https://mybooks.app/entrar"),
    );

    expect(redirect.status).toBe(307);
    expect(redirect.cookies.get("sb-ref-auth-token")?.value).toBe(
      "base64-novo",
    );
    expect(redirect.headers.get("cache-control")).toContain("no-store");
  });

  test("sem cookie novo, o redirecionamento não ganha cabeçalho de cache", () => {
    const redirect = carryAuth(
      NextResponse.next(),
      NextResponse.redirect("https://mybooks.app/entrar"),
    );
    expect(redirect.headers.get("cache-control")).toBeNull();
    expect(redirect.cookies.getAll()).toEqual([]);
  });
});
