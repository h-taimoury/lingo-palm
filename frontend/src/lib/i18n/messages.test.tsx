import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { expect, it } from "vitest";
import { createTranslator, parseLocale } from "./messages";
import fa from "./fa.json";
import { LocaleProvider } from "./LocaleProvider";
import { HeroSection } from "@/components/home/HeroSection";
import { CourseCard } from "@/components/courses/CourseCard";
import { learnerNavLinks, getAdminNavLinks } from "@/components/navigation/nav-links";
import type { CourseSummary } from "@/types/api/courses";

it("defaults to English unless Persian is explicitly selected", () => {
  for (const value of [undefined, null, "", "en", "fr", "FA", "fa; Path=/"]) {
    expect(parseLocale(value)).toBe("en");
  }
  expect(parseLocale("fa")).toBe("fa");
});

it("keeps English copy, translates Persian, and interpolates values literally", () => {
  expect(createTranslator("en")("Page {0} of {1}", { 0: 2, 1: 5 })).toBe("Page 2 of 5");
  expect(createTranslator("fa")("Page {0} of {1}", { 0: 2, 1: 5 })).toBe("صفحه 2 از 5");
  expect(createTranslator("fa")("Learn {0}", { 0: "$& {1}" })).toBe("یادگیری $& {1}");
  expect(createTranslator("fa")("Unrecognized server message")).toBe("Unrecognized server message");
  expect(createTranslator("fa")("toString")).toBe("toString");
});

it("renders the landing page in both languages without changing its links", () => {
  for (const locale of ["en", "fa"] as const) {
    const html = renderToStaticMarkup(<LocaleProvider locale={locale}><HeroSection isAuthenticated={false} /></LocaleProvider>);
    expect(html).toContain(locale === "fa" ? "شروع رایگان یادگیری" : "Start learning free");
    expect(html).toContain('href="/register"');
    expect(html).toContain(locale === "fa" ? "ویدیوهای واقعی" : "Authentic video");
  }
});

it("translates course labels while keeping authored lesson content intact", () => {
  const course = { id: 7, title: "English lesson", description: "Real English dialogue.", level: "Beginner", is_free: true } as CourseSummary;
  const html = renderToStaticMarkup(<LocaleProvider locale="fa"><CourseCard course={course} thumbnail={null} /></LocaleProvider>);
  expect(html).toContain("مبتدی");
  expect(html).toContain("رایگان");
  expect(html).toContain("English lesson");
  expect(html).toContain("Real English dialogue.");
});

it("covers every static translation call and navigation label in the Persian catalogue", () => {
  const root = path.resolve(process.cwd(), "src");
  const missing = new Set<string>();
  for (const file of readdirSync(root, { recursive: true }) as string[]) {
    if (!file.endsWith(".tsx") || file.includes(".test.")) continue;
    const source = ts.createSourceFile(file, readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === "t" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        const key = node.arguments[0].text;
        if (!Object.hasOwn(fa, key)) missing.add(key);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  for (const item of [...learnerNavLinks, ...getAdminNavLinks(true)]) {
    if (!Object.hasOwn(fa, item.title)) missing.add(item.title);
  }
  expect([...missing]).toEqual([]);
  for (const [key, translation] of Object.entries(fa)) {
    expect(translation.trim(), key).not.toBe("");
    const placeholders = key.match(/\{\w+\}/g) ?? [];
    for (const placeholder of translation.match(/\{\w+\}/g) ?? []) {
      expect(placeholders, key).toContain(placeholder);
    }
  }
});
