import { Model, PipelineStage, Types } from "mongoose";

type FilterCast = "string" | "boolean" | "number" | "objectId";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Aggregation-pipeline equivalent of QueryBuilder (AGENTS.md §5) for list endpoints
 * that need `$lookup` joins. Same query contract: `searchTerm|search`, `sort`, `page`, `limit`.
 *
 *   const { meta, data } = await new AggregationBuilder(Model, query, baseMatch)
 *     .search(["name"]).filter({ status: "string" }).sort().execute(projectionStages);
 */
class AggregationBuilder {
  private readonly model: Model<any>;
  private readonly query: Record<string, unknown>;
  private readonly stages: PipelineStage[] = [];
  private sortStage: Record<string, 1 | -1> = { createdAt: -1 };

  constructor(model: Model<any>, query: Record<string, unknown>, baseMatch: Record<string, unknown> = {}) {
    this.model = model;
    this.query = query;
    if (Object.keys(baseMatch).length) this.stages.push({ $match: baseMatch });
  }

  /** Case-insensitive regex search across fields (joined fields allowed after `addStages`). */
  search(fields: string[]) {
    const term = (this.query.searchTerm || this.query.search) as string | undefined;
    if (term && String(term).trim()) {
      const regex = { $regex: escapeRegex(String(term).trim()), $options: "i" };
      this.stages.push({ $match: { $or: fields.map((f) => ({ [f]: regex })) } });
    }
    return this;
  }

  /** Exact-match filters for whitelisted query keys, cast to the stored type. */
  filter(allowed: Record<string, FilterCast>) {
    const match: Record<string, unknown> = {};
    Object.entries(allowed).forEach(([key, cast]) => {
      const raw = this.query[key];
      if (raw === undefined || raw === null || raw === "") return;
      const value = String(raw);
      if (cast === "boolean") match[key] = value === "true";
      else if (cast === "number") match[key] = Number(value);
      else if (cast === "objectId") {
        if (Types.ObjectId.isValid(value)) match[key] = new Types.ObjectId(value);
      } else match[key] = value;
    });
    if (Object.keys(match).length) this.stages.push({ $match: match });
    return this;
  }

  /** Extra `$match` conditions computed by the service. */
  match(condition: Record<string, unknown>) {
    if (Object.keys(condition).length) this.stages.push({ $match: condition });
    return this;
  }

  /** Stages that must run before search/pagination (e.g. a `$lookup` whose fields are searched). */
  addStages(...stages: PipelineStage[]) {
    this.stages.push(...stages);
    return this;
  }

  /** `sort=-createdAt,name` → `{ createdAt: -1, name: 1 }`. */
  sort(defaultSort = "-createdAt") {
    const raw = (this.query.sort as string) || defaultSort;
    const sort: Record<string, 1 | -1> = {};
    raw.split(",").map((s) => s.trim()).filter(Boolean).forEach((field) => {
      if (field.startsWith("-")) sort[field.slice(1)] = -1;
      else sort[field] = 1;
    });
    this.sortStage = Object.keys(sort).length ? sort : { createdAt: -1 };
    return this;
  }

  /** Paginates inside one `$facet`; `postStages` (lookups/projections) run only on the page. */
  async execute(postStages: PipelineStage.FacetPipelineStage[] = []) {
    const page = Math.max(Number(this.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(this.query.limit) || 10, 1), 100);

    const [result] = await this.model.aggregate([
      ...this.stages,
      { $sort: this.sortStage },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }, ...postStages],
          total: [{ $count: "count" }],
        },
      },
    ]);

    const total: number = result?.total?.[0]?.count || 0;
    return {
      meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
      data: (result?.data || []) as Record<string, any>[],
    };
  }
}

export default AggregationBuilder;
