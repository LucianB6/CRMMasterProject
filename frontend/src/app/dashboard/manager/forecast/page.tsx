'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BrainCircuit, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../lib/utils';
import { Label } from '../../../../components/ui/label';
import { Input } from '../../../../components/ui/input';
import { ApiError, apiFetch } from '../../../../lib/api';

type MlModelResponse = {
  id: string;
  name: string;
  version: string;
  status: string;
  trained_at: string | null;
};

type MlPredictionResponse = {
  id: string;
  model_id: string;
  prediction_date: string;
  horizon_days: number;
  predicted_revenue: number;
  lower_bound: number;
  upper_bound: number;
};

type ForecastSummary = {
  prediction: string;
  confidence: 'High' | 'Medium' | 'Low';
  summary: string;
};

const HORIZON_DAYS = 30;
const MAX_HORIZON_DAYS = 360;
const DAILY_HORIZON_DAYS = 1;
const MODEL_NAME = 'forecast_rf';
const MODEL_VERSION = 'v1';

const formatIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const addMonths = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const buildDefaultTrainFrom = () => {
  return formatIsoDate(addMonths(new Date(), -6));
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
  }).format(value);

const formatDisplayDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(Date.UTC(year, month, day)).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return new Date(value).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const addDays = (dateValue: string, days: number) => {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
};

const getTodayIso = () => formatIsoDate(new Date());

const daysBetween = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
};

export default function ExpectedSalesPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [models, setModels] = useState<MlModelResponse[]>([]);
  const [dailyPredictions, setDailyPredictions] = useState<MlPredictionResponse[]>(
    []
  );
  const [aggregatePrediction, setAggregatePrediction] =
    useState<MlPredictionResponse | null>(null);
  const [activeModelId, setActiveModelId] = useState<string>('');
  const [trainFrom, setTrainFrom] = useState(buildDefaultTrainFrom);
  const [trainTo, setTrainTo] = useState(() => formatIsoDate(new Date()));
  const [forecastFrom, setForecastFrom] = useState(() =>
    addDays(formatIsoDate(new Date()), 1)
  );
  const [forecastTo, setForecastTo] = useState(() =>
    formatIsoDate(addMonths(new Date(), 6))
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem('salesway_token');
  }, []);

  const buildHeaders = useCallback(
    (withJson = false) => {
      const token = getAuthToken();
      return {
        ...(withJson ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    },
    [getAuthToken]
  );

  const normalizeErrorMessage = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return 'Resource not found (404).';
      }
      if (error.status === 403) {
        if ((error.body ?? '').toLowerCase().includes('no eligible membership')) {
          return 'No active membership for the company. Contact the administrator.';
        }
        return 'Access denied (403). Check authentication.';
      }
      if (error.status === 409) {
        return 'Save conflict (409). Check if the model already exists.';
      }
      if (error.status >= 500) {
        return 'The server encountered an error. Try again later.';
      }
      return error.message;
    }
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes('failed to fetch')) {
        return 'Unable to reach the ML server. Check the connection and API configuration.';
      }
      return error.message;
    }
    return 'Unknown error';
  };

  const fetchModels = useCallback(async () => {
    const data = await apiFetch<MlModelResponse[]>('/ml/models', {
      headers: buildHeaders(),
    });
    setModels(data);
    if (data.length > 0) {
      setActiveModelId((prev) => prev || data[0].id);
    }
    return data;
  }, [buildHeaders]);

  const fetchLatestPredictions = useCallback(
    async (predictionDateOverride?: string) => {
      const query = new URLSearchParams({
        horizon_days: String(HORIZON_DAYS),
      });
      if (predictionDateOverride) {
        query.set('prediction_date', predictionDateOverride);
      }
      const data = await apiFetch<MlPredictionResponse[]>(
        `/ml/predictions/latest?${query.toString()}`,
        { headers: buildHeaders() }
      );
      const latest = data[0] ?? null;
      setAggregatePrediction(latest);
      if (latest) {
        setActiveModelId(latest.model_id);
      }
      return latest;
    },
    [buildHeaders]
  );

  const fetchPredictionsForModel = useCallback(
    async (modelId: string, fromDate: string, toDate: string) => {
      const query = new URLSearchParams({
        model_id: modelId,
        horizon_days: String(DAILY_HORIZON_DAYS),
        from: fromDate,
        to: toDate,
      });

      const data = await apiFetch<MlPredictionResponse[]>(
        `/ml/predictions?${query.toString()}`,
        { headers: buildHeaders() }
      );
      setDailyPredictions(data);
    },
    [buildHeaders]
  );

  const fetchActiveModelByName = useCallback(async () => {
    const query = new URLSearchParams({
      status: 'ACTIVE',
      name: MODEL_NAME,
    });
    const data = await apiFetch<MlModelResponse[]>(`/ml/models?${query.toString()}`, {
      headers: buildHeaders(),
    });
    if (data.length === 0) {
      throw new Error('No active model available.');
    }
    const sorted = [...data].sort((a, b) =>
      (b.trained_at ?? '').localeCompare(a.trained_at ?? '')
    );
    return sorted[0];
  }, [buildHeaders]);

  const getLatestActiveModel = useCallback(
    (items: MlModelResponse[]) => {
      const active = items.filter((model) => model.status === 'ACTIVE');
      if (active.length === 0) {
        return null;
      }
      const sorted = [...active].sort((a, b) =>
        (b.trained_at ?? '').localeCompare(a.trained_at ?? '')
      );
      return sorted[0];
    },
    []
  );

  const fetchDailyWindowForModel = useCallback(
    async (modelId: string, from: string, to: string) => {
      await fetchPredictionsForModel(modelId, from, to);
    },
    [fetchPredictionsForModel]
  );

  const initializePage = useCallback(async () => {
    setIsInitializing(true);
    setErrorMessage(null);
    const token = getAuthToken();
    if (!token) {
      setErrorMessage('You are not authenticated. Sign in to view forecasts.');
      setIsInitializing(false);
      return;
    }

    try {
      const data = await fetchModels();
      const active = getLatestActiveModel(data);
      if (active) {
        setActiveModelId(active.id);
      }
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error));
    } finally {
      setIsInitializing(false);
    }
  }, [fetchModels, getLatestActiveModel, getAuthToken]);

  useEffect(() => {
    void initializePage();
  }, [initializePage]);

  const handleGenerateForecast = async () => {
    setErrorMessage(null);

    const token = getAuthToken();
    if (!token) {
      setErrorMessage('You are not authenticated. Sign in and try again.');
      return;
    }

    if (!forecastFrom || !forecastTo) {
      setErrorMessage('Select the forecast interval.');
      return;
    }

    if (new Date(forecastFrom) > new Date(forecastTo)) {
      setErrorMessage('Start date must be before end date.');
      return;
    }

    const selectedDays = daysBetween(forecastFrom, forecastTo);
    if (selectedDays > MAX_HORIZON_DAYS) {
      setErrorMessage(
        `The selected interval exceeds the allowed horizon of ${MAX_HORIZON_DAYS} days.`
      );
      return;
    }

    setIsGenerating(true);
    try {
      console.info('[forecast] generate: inputs', {
        train_from: trainFrom,
        train_to: trainTo,
        forecast_from: forecastFrom,
        forecast_to: forecastTo,
        selected_days: selectedDays,
      });
      let trainedModel: MlModelResponse;
      if (!trainFrom || !trainTo) {
        setErrorMessage('Select the training interval.');
        return;
      }
      if (new Date(trainFrom) > new Date(trainTo)) {
        setErrorMessage('Start date must be before end date.');
        return;
      }
      try {
        trainedModel = await apiFetch<MlModelResponse>('/ml/models/train', {
          method: 'POST',
          headers: {
            ...buildHeaders(true),
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: MODEL_NAME,
            version: MODEL_VERSION,
            horizon_days: HORIZON_DAYS,
            train_from: trainFrom,
            train_to: trainTo,
          }),
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          trainedModel = await fetchActiveModelByName();
        } else {
          throw error;
        }
      }

      setModels((prev) => {
        const existingIndex = prev.findIndex((item) => item.id === trainedModel.id);
        if (existingIndex === -1) {
          return [trainedModel, ...prev];
        }
        const next = [...prev];
        next[existingIndex] = trainedModel;
        return next;
      });
      setActiveModelId(trainedModel.id);

      const data = await apiFetch<MlPredictionResponse[]>(
        '/ml/predictions/refresh',
        {
          method: 'POST',
          headers: {
            ...buildHeaders(true),
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            model_id: trainedModel.id,
            prediction_date: forecastFrom,
            horizon_days: selectedDays,
          }),
        }
      );
      const aggregate = data.find(
        (item) => item.horizon_days === HORIZON_DAYS
      );
      const daily = data.filter(
        (item) => item.horizon_days === DAILY_HORIZON_DAYS
      );
      const sortedDaily = daily.sort((a, b) =>
        a.prediction_date.localeCompare(b.prediction_date)
      );
      setAggregatePrediction(aggregate ?? null);
      setDailyPredictions(sortedDaily);
    } catch (error) {
      if (error instanceof ApiError) {
        console.error('[forecast] refresh error', {
          status: error.status,
          body: error.body,
          message: error.message,
        });
      } else {
        console.error('[forecast] refresh error', error);
      }
      setErrorMessage(normalizeErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const horizonLabelDays = useMemo(() => {
    if (dailyPredictions.length > 0) {
      return dailyPredictions.length;
    }
    if (aggregatePrediction?.horizon_days) {
      return aggregatePrediction.horizon_days;
    }
    if (forecastFrom && forecastTo) {
      return daysBetween(forecastFrom, forecastTo);
    }
    return HORIZON_DAYS;
  }, [aggregatePrediction?.horizon_days, dailyPredictions.length, forecastFrom, forecastTo]);

  const forecast = useMemo<ForecastSummary | null>(() => {
    if (dailyPredictions.length === 0 && !aggregatePrediction) {
      return null;
    }
    const sorted = [...dailyPredictions].sort((a, b) =>
      a.prediction_date.localeCompare(b.prediction_date)
    );
    const total = aggregatePrediction
      ? Number(aggregatePrediction.predicted_revenue ?? 0)
      : sorted.reduce(
          (sum, item) => sum + Number(item.predicted_revenue ?? 0),
          0
        );
    const activeModel = models.find((model) => model.id === activeModelId);
    const from = sorted[0]?.prediction_date ?? aggregatePrediction?.prediction_date;
    const to =
      sorted[sorted.length - 1]?.prediction_date ?? aggregatePrediction?.prediction_date;

    return {
      prediction:
        from && to
          ? `Total estimate: ${formatCurrency(total)} for the interval ${formatDisplayDate(
              from
            )} - ${formatDisplayDate(to)}.`
          : `Total estimate: ${formatCurrency(total)}.`,
      confidence: 'Medium',
      summary: `Modelul ${activeModel?.name ?? 'selectat'} (${
        activeModel?.version ?? 'v1'
      }) generated the forecast based on data between ${formatDisplayDate(
        trainFrom
      )} and ${formatDisplayDate(trainTo)}.`,
    };
  }, [activeModelId, aggregatePrediction, dailyPredictions, models, trainFrom, trainTo]);

  const chartData = useMemo(
    () =>
      dailyPredictions.map((prediction) => ({
        date: formatDisplayDate(prediction.prediction_date),
        forecast: Number(prediction.predicted_revenue ?? 0),
        lower: Number(prediction.lower_bound ?? 0),
        upper: Number(prediction.upper_bound ?? 0),
      })),
    [dailyPredictions]
  );

  const getConfidenceBadgeColor = (
    confidence: 'High' | 'Medium' | 'Low' | undefined
  ) => {
    switch (confidence) {
      case 'High':
        return 'bg-green-500 hover:bg-green-500/90';
      case 'Medium':
        return 'bg-yellow-500 hover:bg-yellow-500/90';
      case 'Low':
        return 'bg-red-500 hover:bg-red-500/90';
      default:
        return 'bg-muted';
    }
  };


  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-2xl">Expected Sales (AI Forecast)</h1>
        <p className="text-muted-foreground">
          Use AI to forecast future sales performance based on historical data.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Sales forecast</CardTitle>
          <CardDescription>
            Select the forecast interval (max {MAX_HORIZON_DAYS} days).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 md:items-end">
          <div className="space-y-2">
            <Label htmlFor="train-from">Training: from</Label>
            <Input
              id="train-from"
              type="date"
              value={trainFrom}
              onChange={(event) => setTrainFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="train-to">Training: to</Label>
            <Input
              id="train-to"
              type="date"
              value={trainTo}
              onChange={(event) => setTrainTo(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="forecast-from">Forecast: from</Label>
            <Input
              id="forecast-from"
              type="date"
              value={forecastFrom}
              onChange={(event) => setForecastFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="forecast-to">Forecast: to</Label>
            <Input
              id="forecast-to"
              type="date"
              value={forecastTo}
              onChange={(event) => setForecastTo(event.target.value)}
            />
          </div>
          <Button type="button" onClick={handleGenerateForecast} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <BrainCircuit className="mr-2 h-4 w-4" />
                Generate Forecast
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {errorMessage && (
        <Card className="border border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      )}

      {isInitializing && (
        <Card className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Loader2 className="mx-auto h-10 w-10 animate-spin" />
            <p className="mt-4">
              Loading available models and forecasts...
            </p>
          </div>
        </Card>
      )}

      {!isInitializing && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-accent" />
                <span>Forecast Results</span>
              </CardTitle>
              <CardDescription>
                Latest predictions for the horizon of {horizonLabelDays} days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                <div className="space-y-2 rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold">Primary Forecast</h3>
                    <Badge
                      className={cn(
                        'text-primary-foreground',
                        getConfidenceBadgeColor(forecast?.confidence)
                      )}
                    >
                      Confidence: {forecast?.confidence ?? 'Medium'}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {forecast?.prediction ?? 'Waiting for results.'}
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border bg-card p-4">
                  <h3 className="text-lg font-semibold">Analysis Summary</h3>
                  <p className="text-muted-foreground">
                    {forecast?.summary ??
                      'Generate a forecast to see detailed analysis.'}
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>

          {dailyPredictions.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Sales Forecast Chart</CardTitle>
                  <CardDescription>
                    View forecasted sales over the selected interval.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) =>
                          `${(value as number) / 1000}k`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                        }}
                        formatter={(value: number, name: string) => [
                          `${value.toLocaleString('en-US')} RON`,
                          name,
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                      <Bar
                        dataKey="forecast"
                        name="Sales Prognozate"
                        fill="hsl(var(--chart-2))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Forecast details</CardTitle>
                  <CardDescription>
                    List of predictions for each day in the interval.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Forecast value</th>
                          <th className="py-2 pr-4">Lower bound</th>
                          <th className="py-2">Upper bound</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyPredictions.map((prediction) => (
                          <tr key={prediction.id} className="border-t">
                            <td className="py-2 pr-4">
                              {formatDisplayDate(prediction.prediction_date)}
                            </td>
                            <td className="py-2 pr-4 font-medium text-primary">
                              {formatCurrency(
                                Number(prediction.predicted_revenue ?? 0)
                              )}
                            </td>
                            <td className="py-2 pr-4">
                              {formatCurrency(
                                Number(prediction.lower_bound ?? 0)
                              )}
                            </td>
                            <td className="py-2">
                              {formatCurrency(
                                Number(prediction.upper_bound ?? 0)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <TrendingUp className="h-16 w-16 text-muted-foreground" />
              <h3 className="text-xl font-semibold">No forecasts yet</h3>
              <p className="text-muted-foreground">
                Generate a forecast or adjust filters to see data.
              </p>
            </Card>
          )}
        </div>
      )}

    </div>
  );
}
