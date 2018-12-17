import {Ask} from 'filecoin-network-stats-common/lib/domain/Ask';
import {MarketStats} from 'filecoin-network-stats-common/lib/domain/Stats';
import {TimeseriesDatapoint} from 'filecoin-network-stats-common/lib/domain/TimeseriesDatapoint';
import PGClient from '../PGClient';
import {PoolClient} from 'pg';
import BigNumber from 'bignumber.js';

export interface IMarketStatsDAO {
  getStats (): Promise<MarketStats>
}

export class PostgresMarketStatsDAO implements IMarketStatsDAO {
  private readonly client: PGClient;

  constructor (client: PGClient) {
    this.client = client;
  }

  async getStats (): Promise<MarketStats> {
    return this.client.execute(async (client: PoolClient) => {
      let asks: Ask[] = [];
      const askRows = await client.query(
        'SELECT a.*, m.to_address AS address FROM asks a JOIN messages m ON a.message_id = m.id ORDER BY price DESC LIMIT 10',
      );

      if (askRows.rows.length) {
        asks = this.inflateAsks(askRows.rows);
      }

      return {
        asks,
        bids: [],
        volume: await this.getDailyVolume(client),
      };
    });
  }

  async getDailyVolume (client: PoolClient): Promise<TimeseriesDatapoint[]> {
    const res = await client.query(`
      WITH ts AS (SELECT extract(EPOCH FROM d) AS ts
                  FROM generate_series(date_trunc('day', current_timestamp - INTERVAL '30 days'),
                                       date_trunc('day', current_timestamp), '1 day'::interval) AS d),
           messages AS (SELECT m.*, extract(EPOCH FROM date_trunc('day', to_timestamp(b.ingested_at))) AS ts
                        FROM messages m
                               INNER JOIN blocks b ON b.height = m.height
                        WHERE m.value > 0)
      SELECT t.ts as date, coalesce(sum(m.value), 0) AS amount
      FROM ts t
             LEFT OUTER JOIN messages m ON m.ts = t.ts
      GROUP BY t.ts ORDER BY date ASC;
    `);

    if (!res.rows.length) {
      return [];
    }

    return this.inflateVolume(res.rows);
  }

  inflateVolume (entries: any[]): TimeseriesDatapoint[] {
    return entries.map((e: any) => ({
      amount: new BigNumber(e.amount),
      date: e.date,
    }));
  }

  inflateAsks (asks: any[]): Ask[] {
    return asks.map((ask: any) => ({
      id: Number(ask.id),
      price: new BigNumber(ask.price),
      expiresAt: Number(ask.expires_at),
      address: ask.address,
    }));
  }
}