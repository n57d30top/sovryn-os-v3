import assert from "node:assert/strict";
import test from "node:test";
import {
  ArxivSearchAdapter,
  createPriorArtSearchAdapter,
  createPublicSourceSearchAdapter,
  GitHubSearchAdapter,
  normalizePublicSourceSearchConfig,
  OpenAlexSearchAdapter,
  summarizePriorArtSearchResults,
  type FetchLike,
} from "../src/core/invention/providers.js";

test("GitHub public-source adapter maps repository search results", async () => {
  const requests: string[] = [];
  const fetcher: FetchLike = async (url) => {
    requests.push(url);
    return jsonResponse({
      items: [
        {
          full_name: "sovryn/self-verifying-agent-research",
          html_url: "https://github.com/sovryn/self-verifying-agent-research",
          description: "Evidence-based autonomous research agents",
        },
      ],
    });
  };
  const results = await new GitHubSearchAdapter({
    fetcher,
    limit: 1,
  }).search({
    brief: "self verifying autonomous research agents",
    sources: ["github"],
  });
  assert.match(requests[0], /api\.github\.com\/search\/repositories/);
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, "concrete_source");
  assert.equal(results[0].sourceType, "github");
  assert.equal(results[0].title, "sovryn/self-verifying-agent-research");
  assert.equal(
    results[0].url,
    "https://github.com/sovryn/self-verifying-agent-research",
  );
  assert.equal(results[0].relevance, "high");
});

test("OpenAlex public-source adapter maps works search results", async () => {
  const fetcher: FetchLike = async () =>
    jsonResponse({
      results: [
        {
          title: "Verifiable Autonomous Research Workflows",
          doi: "https://doi.org/10.0000/example",
          publication_year: 2026,
        },
      ],
    });
  const results = await new OpenAlexSearchAdapter({
    fetcher,
    limit: 1,
  }).search({
    brief: "verifiable autonomous research workflows",
    sources: ["papers"],
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, "concrete_source");
  assert.equal(results[0].sourceType, "paper");
  assert.equal(results[0].title, "Verifiable Autonomous Research Workflows");
  assert.equal(
    results[0].citation,
    "Verifiable Autonomous Research Workflows (2026)",
  );
});

test("arXiv public-source adapter parses Atom search entries", async () => {
  const fetcher: FetchLike = async () =>
    textResponse(`<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>https://arxiv.org/abs/2601.00001</id>
    <title>Self-Verifying Research Agents</title>
    <summary>Agents that emit reproducible evidence for research tasks.</summary>
  </entry>
</feed>`);
  const results = await new ArxivSearchAdapter({
    fetcher,
    limit: 1,
  }).search({
    brief: "self verifying research agents",
    sources: ["papers"],
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, "concrete_source");
  assert.equal(results[0].sourceType, "paper");
  assert.equal(results[0].title, "Self-Verifying Research Agents");
  assert.equal(results[0].url, "https://arxiv.org/abs/2601.00001");
});

test("composite public-source adapter includes live adapters and public query links", async () => {
  const fetcher: FetchLike = async (url) => {
    if (url.includes("api.github.com")) {
      return jsonResponse({
        items: [
          {
            full_name: "sovryn/open-research",
            html_url: "https://github.com/sovryn/open-research",
            description: "Open research artifacts",
          },
        ],
      });
    }
    if (url.includes("api.openalex.org")) {
      return jsonResponse({
        results: [
          {
            title: "Open Research Artifact Systems",
            id: "https://openalex.org/W1",
          },
        ],
      });
    }
    return textResponse(
      `<feed><entry><id>https://arxiv.org/abs/2601.1</id><title>Open Agent Research</title><summary>Evidence artifacts.</summary></entry></feed>`,
    );
  };
  const results = await createPublicSourceSearchAdapter(
    {
      maxResultsPerSource: 1,
      includeQueryLinks: true,
    },
    fetcher,
  ).search({
    brief: "open research artifacts",
    sources: ["web", "github", "papers", "standards", "patents"],
  });
  assert.equal(
    results.some((result) => result.sourceType === "github"),
    true,
  );
  assert.equal(
    results.some((result) => result.sourceType === "paper"),
    true,
  );
  assert.equal(
    results.some((result) => result.sourceType === "patent"),
    true,
  );
  assert.equal(
    results.some((result) => result.sourceType === "standard"),
    true,
  );
  assert.equal(
    results.some((result) => result.sourceType === "web"),
    true,
  );
  const summary = summarizePriorArtSearchResults(results);
  assert.equal(summary.status, "ok");
  assert.equal(summary.concreteResultCount, 3);
  assert.equal(summary.linkOnlyResultCount, 3);
  assert.equal(summary.failureCount, 0);
});

test("composite public-source adapter records adapter failures as degraded evidence", async () => {
  const fetcher: FetchLike = async () => {
    throw new Error("network unavailable");
  };
  const results = await createPublicSourceSearchAdapter(
    {
      maxResultsPerSource: 1,
      includeQueryLinks: false,
    },
    fetcher,
  ).search({
    brief: "open research artifacts",
    sources: ["github", "papers"],
  });
  assert.equal(results.length, 3);
  assert.equal(
    results.every((result) => result.kind === "adapter_failure"),
    true,
  );
  const summary = summarizePriorArtSearchResults(results);
  assert.equal(summary.status, "failed");
  assert.equal(summary.concreteResultCount, 0);
  assert.equal(summary.failureCount, 3);
  assert.deepEqual(summary.failedSources, ["github", "paper"]);
});

test("public-source search config clamps unsafe limits and timeouts", () => {
  assert.deepEqual(
    normalizePublicSourceSearchConfig({
      enabled: true,
      maxResultsPerSource: 999,
      maxTotalResults: -2,
      timeoutMs: 1,
      includeQueryLinks: false,
      githubTokenEnv: "",
    }),
    {
      enabled: true,
      maxResultsPerSource: 10,
      maxTotalResults: 1,
      timeoutMs: 1000,
      includeQueryLinks: false,
      githubTokenEnv: null,
    },
  );
  assert.deepEqual(
    normalizePublicSourceSearchConfig({
      maxResultsPerSource: Number.NaN,
      maxTotalResults: Number.NaN,
      timeoutMs: Number.NaN,
      githubTokenEnv: "SOVRYN_GITHUB_TOKEN",
    }),
    {
      enabled: false,
      maxResultsPerSource: 3,
      maxTotalResults: 30,
      timeoutMs: 8000,
      includeQueryLinks: true,
      githubTokenEnv: "SOVRYN_GITHUB_TOKEN",
    },
  );
});

test("prior-art adapter treats non-boolean public-search toggles as disabled", async () => {
  let called = false;
  const fetcher: FetchLike = async () => {
    called = true;
    return jsonResponse({ items: [] });
  };
  const adapter = createPriorArtSearchAdapter(
    {
      research: {
        publicSearch: {
          enabled: "false",
          includeQueryLinks: "true",
          maxResultsPerSource: 1,
          maxTotalResults: 1,
          timeoutMs: 1000,
          githubTokenEnv: null,
        },
      },
    } as any,
    fetcher,
  );
  const results = await adapter.search({
    brief: "open research artifacts",
    sources: ["github"],
  });
  assert.equal(called, false);
  assert.equal(results.length, 1);
  assert.equal(results[0].kind, "mock_placeholder");
});

function jsonResponse(value: unknown): ReturnType<FetchLike> {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => value,
  });
}

function textResponse(value: string): ReturnType<FetchLike> {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: async () => value,
  });
}
