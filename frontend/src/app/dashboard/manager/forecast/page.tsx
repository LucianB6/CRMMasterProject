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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
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
const DAILY_HORIZON_DAYS = 1;
const MODEL_NAME = 'forecast_rf';
const MODEL_VERSION = 'v1';

const formatIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const buildDefaultTrainFrom = () => {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return formatIsoDate(date);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
  }).format(value);

const formatDisplayDate = (value: string) =>
  new Date(value).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

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

const buildDefaultPredictionWindow = (anchorDate?: string) => {
  const today = anchorDate ?? getTodayIso();
  return {
    from: addDays(today, -(HORIZON_DAYS - 1)),
    to: today,
  };
};

export default function ExpectedSalesPage() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [models, setModels] = useState<MlModelResponse[]>([]);
  const [dailyPredictions, setDailyPredictions] = useState<MlPredictionResponse[]>(
    []
  );
  const [aggregatePrediction, setAggregatePrediction] =
    useState<MlPredictionResponse | null>(null);
  const [activeModelId, setActiveModelId] = useState<string>('');
  const [trainFrom, setTrainFrom] = useState(buildDefaultTrainFrom);
  const [trainTo, setTrainTo] = useState(() => formatIsoDate(new Date()));
  const [predictionDate, setPredictionDate] = useState(() =>
    formatIsoDate(new Date())
  );
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
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
        return 'Resursa nu a fost găsită (404).';
      }
      if (error.status === 403) {
        if ((error.body ?? '').toLowerCase().includes('no eligible membership')) {
          return 'Nu există un membership activ pentru companie. Contactează administratorul.';
        }
        return 'Acces interzis (403). Verifică autentificarea.';
      }
      if (error.status === 409) {
        return 'Conflict la salvare (409). Verifică dacă modelul există deja.';
      }
      if (error.status >= 500) {
        return 'Serverul a întâmpinat o eroare. Încearcă din nou mai târziu.';
      }
      return error.message;
    }
    if (error instanceof Error) {
      if (error.message.toLowerCase().includes('failed to fetch')) {
        return 'Nu am putut contacta serverul ML. Verifică conexiunea și configurarea API.';
      }
      return error.message;
    }
    return 'Eroare necunoscută';
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
        const from = latest.prediction_date;
        const to = addDays(from, HORIZON_DAYS - 1);
        setFilterFrom(from);
        setFilterTo(to);
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
      throw new Error('Nu există un model activ disponibil.');
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
    async (modelId: string) => {
      const { from, to } = buildDefaultPredictionWindow();
      setFilterFrom(from);
      setFilterTo(to);
      await fetchPredictionsForModel(modelId, from, to);
    },
    [fetchPredictionsForModel]
  );

  const fetchFilteredPredictions = useCallback(async (options?: {
    from?: string;
    to?: string;
    modelId?: string;
  }) => {
    const resolvedFrom = options?.from ?? filterFrom;
    const resolvedTo = options?.to ?? filterTo;
    const resolvedModelId = options?.modelId ?? activeModelId;
    const query = new URLSearchParams();
    if (resolvedFrom) {
      query.set('from', resolvedFrom);
    }
    if (resolvedTo) {
      query.set('to', resolvedTo);
    }
    if (resolvedModelId) {
      query.set('model_id', resolvedModelId);
    }
    query.set('horizon_days', String(DAILY_HORIZON_DAYS));

    const data = await apiFetch<MlPredictionResponse[]>(
      `/ml/predictions?${query.toString()}`,
      { headers: buildHeaders() }
    );
    setDailyPredictions(data);
  }, [
    activeModelId,
    buildHeaders,
    filterFrom,
    filterTo,
  ]);

  const initializePage = useCallback(async () => {
    setIsInitializing(true);
    setErrorMessage(null);
    const token = getAuthToken();
    if (!token) {
      setErrorMessage('Nu ești autentificat. Conectează-te pentru a vedea prognozele.');
      setIsInitializing(false);
      return;
    }
    let loadedModels: MlModelResponse[] = [];
    try {
      loadedModels = await fetchModels();
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error));
    }

    try {
      const latest = await fetchLatestPredictions();
      if (latest) {
        const from = latest.prediction_date;
        const to = addDays(from, HORIZON_DAYS - 1);
        await fetchPredictionsForModel(latest.model_id, from, to);
      } else {
        setDailyPredictions([]);
      }
    } catch (error) {
      const message = normalizeErrorMessage(error);
      if (message.includes('(404)')) {
        const activeModel =
          loadedModels.length > 0 ? getLatestActiveModel(loadedModels) : null;
        if (activeModel) {
          setActiveModelId(activeModel.id);
          try {
            await fetchDailyWindowForModel(activeModel.id);
          } catch (fetchError) {
            setErrorMessage(normalizeErrorMessage(fetchError));
            setDailyPredictions([]);
          }
        } else {
          setDailyPredictions([]);
        }
      } else {
        setErrorMessage(message);
        setDailyPredictions([]);
      }
    } finally {
      setIsInitializing(false);
    }
  }, [
    fetchDailyWindowForModel,
    fetchLatestPredictions,
    fetchModels,
    fetchPredictionsForModel,
    getLatestActiveModel,
  ]);

  useEffect(() => {
    void initializePage();
  }, [initializePage]);

  const handleGenerateForecast = async () => {
    setErrorMessage(null);

    const token = getAuthToken();
    if (!token) {
      setErrorMessage('Nu ești autentificat. Conectează-te și încearcă din nou.');
      return;
    }

    if (!trainFrom || !trainTo) {
      setErrorMessage('Selectează intervalul de training.');
      return;
    }

    if (new Date(trainFrom) > new Date(trainTo)) {
      setErrorMessage('Data de început trebuie să fie înainte de data de final.');
      return;
    }

    const resolvedPredictionDate = predictionDate || trainTo;

    setIsGenerating(true);
    try {
      let trainedModel: MlModelResponse;
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
          const existingModel = await fetchActiveModelByName();
          setModels((prev) => {
            const existingIndex = prev.findIndex((item) => item.id === existingModel.id);
            if (existingIndex === -1) {
              return [existingModel, ...prev];
            }
            const next = [...prev];
            next[existingIndex] = existingModel;
            return next;
          });
          setActiveModelId(existingModel.id);
          const data = await apiFetch<MlPredictionResponse[]>(
            '/ml/predictions/refresh',
            {
              method: 'POST',
              headers: {
                ...buildHeaders(true),
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                model_id: existingModel.id,
                prediction_date: resolvedPredictionDate,
                horizon_days: HORIZON_DAYS,
              }),
            }
          );
          const aggregate = data.find(
            (item) => item.horizon_days === HORIZON_DAYS
          );
          const daily = data.filter(
            (item) => item.horizon_days === DAILY_HORIZON_DAYS
          );
          setAggregatePrediction(aggregate ?? null);
          if (aggregate) {
            const from = aggregate.prediction_date;
            const to = addDays(from, HORIZON_DAYS - 1);
            setFilterFrom(from);
            setFilterTo(to);
          }
          setDailyPredictions(
            daily.sort((a, b) =>
              a.prediction_date.localeCompare(b.prediction_date)
            )
          );
          return;
        }
        throw error;
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
            prediction_date: resolvedPredictionDate,
            horizon_days: HORIZON_DAYS,
          }),
        }
      );
      const aggregate = data.find(
        (item) => item.horizon_days === HORIZON_DAYS
      );
      const daily = data.filter(
        (item) => item.horizon_days === DAILY_HORIZON_DAYS
      );
      setAggregatePrediction(aggregate ?? null);
      if (aggregate) {
        const from = aggregate.prediction_date;
        const to = addDays(from, HORIZON_DAYS - 1);
        setFilterFrom(from);
        setFilterTo(to);
      }
      setDailyPredictions(
        daily.sort((a, b) => a.prediction_date.localeCompare(b.prediction_date))
      );
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFilterPredictions = async () => {
    setErrorMessage(null);
    setIsFiltering(true);
    try {
      const fromDate = getTodayIso();
      setFilterFrom(fromDate);
      if (!filterTo) {
        setErrorMessage('Selectează data până la care vrei prognoza.');
        return;
      }
      if (new Date(fromDate) > new Date(filterTo)) {
        setErrorMessage('Data de final trebuie să fie după data curentă.');
        return;
      }
      if (!activeModelId) {
        setErrorMessage('Selectează un model activ.');
        return;
      }
      if (aggregatePrediction) {
        const allowedFrom = aggregatePrediction.prediction_date;
        if (fromDate < allowedFrom) {
          setErrorMessage(
            'Data de început este înainte de perioada disponibilă pentru model.'
          );
          return;
        }
      }
      await fetchFilteredPredictions({
        from: fromDate,
        to: filterTo,
        modelId: activeModelId,
      });
    } catch (error) {
      setErrorMessage(normalizeErrorMessage(error));
    } finally {
      setIsFiltering(false);
    }
  };

  const horizonLabelDays = useMemo(() => {
    if (filterTo) {
      return daysBetween(getTodayIso(), filterTo);
    }
    if (aggregatePrediction?.horizon_days) {
      return aggregatePrediction.horizon_days;
    }
    if (dailyPredictions.length > 0) {
      return dailyPredictions.length;
    }
    return HORIZON_DAYS;
  }, [aggregatePrediction?.horizon_days, dailyPredictions.length, filterTo]);

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
      sorted[sorted.length - 1]?.prediction_date ??
      (aggregatePrediction
        ? addDays(aggregatePrediction.prediction_date, HORIZON_DAYS - 1)
        : undefined);

    return {
      prediction:
        from && to
          ? `Estimare totală: ${formatCurrency(total)} pentru intervalul ${formatDisplayDate(
              from
            )} - ${formatDisplayDate(to)}.`
          : `Estimare totală: ${formatCurrency(total)}.`,
      confidence: 'Medium',
      summary: `Modelul ${activeModel?.name ?? 'selectat'} (${
        activeModel?.version ?? 'v1'
      }) a generat prognoza pe baza datelor dintre ${formatDisplayDate(
        trainFrom
      )} și ${formatDisplayDate(trainTo)}.`,
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
        <h1 className="font-headline text-2xl">Vanzari Asteptate (Prognoza AI)</h1>
        <p className="text-muted-foreground">
          Utilizeaza AI pentru a prognoza performanta viitoare a vanzarilor pe
          baza datelor istorice.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Genereaza o noua prognoza</CardTitle>
          <CardDescription>
            Selecteaza intervalul de training si data de start pentru prognoza,
            apoi apasa butonul pentru a antrena modelul.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="train-from">Training: de la</Label>
            <Input
              id="train-from"
              type="date"
              value={trainFrom}
              onChange={(event) => setTrainFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="train-to">Training: până la</Label>
            <Input
              id="train-to"
              type="date"
              value={trainTo}
              onChange={(event) => setTrainTo(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prediction-date">Data prognozei</Label>
            <Input
              id="prediction-date"
              type="date"
              value={predictionDate}
              onChange={(event) => setPredictionDate(event.target.value)}
            />
          </div>
          <Button type="button" onClick={handleGenerateForecast} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Se genereaza...
              </>
            ) : (
              <>
                <BrainCircuit className="mr-2 h-4 w-4" />
                Genereaza Prognoza
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
              Se încarcă modelele și prognozele disponibile...
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
                <span>Rezultate Prognoza</span>
              </CardTitle>
              <CardDescription>
                Ultimele predicții pentru orizontul de {horizonLabelDays} zile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                <div className="space-y-2 rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold">Prognoza Principală</h3>
                    <Badge
                      className={cn(
                        'text-primary-foreground',
                        getConfidenceBadgeColor(forecast?.confidence)
                      )}
                    >
                      Încredere: {forecast?.confidence ?? 'Medium'}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {forecast?.prediction ?? 'Așteptăm rezultatele.'}
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border bg-card p-4">
                  <h3 className="text-lg font-semibold">Sumar Analiză</h3>
                  <p className="text-muted-foreground">
                    {forecast?.summary ??
                      'Generează o prognoză pentru a vedea analiza detaliată.'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="filter-model">Model activ</Label>
                  <Select
                    value={activeModelId}
                    onValueChange={setActiveModelId}
                  >
                    <SelectTrigger id="filter-model">
                      <SelectValue placeholder="Selectează modelul" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} ({model.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-from">De la (astăzi)</Label>
                  <Input id="filter-from" type="date" value={getTodayIso()} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-to">Până la</Label>
                  <Input
                    id="filter-to"
                    type="date"
                    value={filterTo}
                    onChange={(event) => setFilterTo(event.target.value)}
                  />
                </div>
              </div>

              <Button type="button" onClick={handleFilterPredictions} disabled={isFiltering}>
                {isFiltering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Se actualizează...
                  </>
                ) : (
                  'Actualizează rezultate'
                )}
              </Button>
            </CardContent>
          </Card>

          {dailyPredictions.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Grafic Prognoză Vânzări</CardTitle>
                  <CardDescription>
                    Vizualizare a vânzărilor prognozate pe intervalul selectat.
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
                          `${value.toLocaleString('ro-RO')} RON`,
                          name,
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                      <Bar
                        dataKey="forecast"
                        name="Vânzări Prognozate"
                        fill="hsl(var(--chart-2))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detalii prognoză</CardTitle>
                  <CardDescription>
                    Lista predicțiilor pentru fiecare zi din interval.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="py-2 pr-4">Dată</th>
                          <th className="py-2 pr-4">Valoare prognozată</th>
                          <th className="py-2 pr-4">Limită inferioară</th>
                          <th className="py-2">Limită superioară</th>
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
              <h3 className="text-xl font-semibold">Nu există prognoze încă</h3>
              <p className="text-muted-foreground">
                Generează o prognoză sau ajustează filtrele pentru a vedea date.
              </p>
            </Card>
          )}
        </div>
      )}

    </div>
  );
}
