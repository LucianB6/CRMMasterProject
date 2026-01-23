'use client';

import { useState } from 'react';
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
import { type ForecastOutput } from '../../../../ai/flows/forecast-flow';
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

export default function ExpectedSalesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [forecast, setForecast] = useState<ForecastOutput | null>(null);
  const [chartData, setChartData] = useState<any[] | null>(null);
  const [forecastPeriod, setForecastPeriod] = useState('3 months');

  const handleGenerateForecast = () => {
    setIsLoading(true);
    setForecast(null);
    setChartData(null);

    // Simulate AI response with a delay and hardcoded data
    setTimeout(() => {
      let periodText = '';
      let predictionValue = '';
      let forecastData: any[] = [];
      const baseData = [
        { month: 'Ian', actual: 85000 },
        { month: 'Feb', actual: 78000 },
        { month: 'Mar', actual: 95000 },
        { month: 'Apr', actual: 92000 },
        { month: 'Mai', actual: 110000 },
        { month: 'Iun', actual: 125000 },
      ];

      if (forecastPeriod === '3 months') {
        periodText = 'urmatoarele 3 luni';
        predictionValue = '380,000 RON';
        forecastData = [
          { month: 'Iul', forecast: 120000 },
          { month: 'Aug', forecast: 125000 },
          { month: 'Sep', forecast: 135000 },
        ];
      } else if (forecastPeriod === '6 months') {
        periodText = 'urmatoarele 6 luni';
        predictionValue = '800,000 RON';
        forecastData = [
          { month: 'Iul', forecast: 120000 },
          { month: 'Aug', forecast: 125000 },
          { month: 'Sep', forecast: 135000 },
          { month: 'Oct', forecast: 140000 },
          { month: 'Nov', forecast: 130000 },
          { month: 'Dec', forecast: 150000 },
        ];
      } else {
        periodText = 'urmatorul an';
        predictionValue = '1,650,000 RON';
        forecastData = [
          { month: 'Iul', forecast: 120000 },
          { month: 'Aug', forecast: 125000 },
          { month: 'Sep', forecast: 135000 },
          { month: 'Oct', forecast: 140000 },
          { month: 'Nov', forecast: 130000 },
          { month: 'Dec', forecast: 150000 },
          { month: "Ian '25", forecast: 145000 },
          { month: "Feb '25", forecast: 135000 },
          { month: "Mar '25", forecast: 160000 },
          { month: "Apr '25", forecast: 155000 },
          { month: "Mai '25", forecast: 170000 },
          { month: "Iun '25", forecast: 180000 },
        ];
      }

      const mockForecast: ForecastOutput = {
        prediction: `Se estimeaza o crestere a valorii totale a contractelor la aproximativ ${predictionValue} in ${periodText}.`,
        confidence: 'Medium',
        summary:
          'Analiza se bazeaza pe trendul ascendent din ultimele 6 luni si pe sezonalitatea specifica industriei. Performanta solida a echipei in Q2 sustine aceasta prognoza pozitiva.',
      };

      const combinedChartData = [...baseData, ...forecastData];

      setChartData(combinedChartData);
      setForecast(mockForecast);
      setIsLoading(false);
    }, 2000);
  };

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
            Alege perioada pentru prognoza, apoi apasa butonul pentru a analiza
            datele agregate de vanzari ale echipei si a genera rezultatul.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          <div className="grid w-full gap-1.5 sm:w-auto">
            <Label htmlFor="forecast-period">Perioada Prognozei</Label>
            <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
              <SelectTrigger id="forecast-period" className="w-full sm:w-[180px]">
                <SelectValue placeholder="Selecteaza perioada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3 months">Urm. 3 luni</SelectItem>
                <SelectItem value="6 months">Urm. 6 luni</SelectItem>
                <SelectItem value="1 year">Urmatorul an</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerateForecast} disabled={isLoading}>
            {isLoading ? (
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

      {isLoading && (
        <Card className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Loader2 className="mx-auto h-10 w-10 animate-spin" />
            <p className="mt-4">
              Modelul AI analizeaza datele istorice... Va rugam asteptati.
            </p>
          </div>
        </Card>
      )}

      {forecast && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-accent" />
                <span>Rezultate Prognoza</span>
              </CardTitle>
              <CardDescription>
                Mai jos este prognoza generata de AI pentru{' '}
                {forecastPeriod === '3 months'
                  ? 'urmatoarele 3 luni'
                  : forecastPeriod === '6 months'
                  ? 'urmatoarele 6 luni'
                  : 'urmatorul an'}
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold">Prognoza Principala</h3>
                  <Badge
                    className={cn(
                      'text-primary-foreground',
                      getConfidenceBadgeColor(forecast.confidence)
                    )}
                  >
                    Incredere: {forecast.confidence}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {forecast.prediction}
                </p>
              </div>

              <div className="space-y-2 rounded-lg border bg-card p-4">
                <h3 className="text-lg font-semibold">Sumar Analiza</h3>
                <p className="text-muted-foreground">{forecast.summary}</p>
              </div>
            </CardContent>
          </Card>

          {chartData && (
            <Card>
              <CardHeader>
                <CardTitle>Grafic Prognoza Vanzari</CardTitle>
                <CardDescription>
                  Vizualizare a vanzarilor istorice si a celor prognozate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
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
                      dataKey="actual"
                      name="Vanzari Reale"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="forecast"
                      name="Vanzari Prognozate"
                      fill="hsl(var(--chart-2))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!isLoading && !forecast && (
        <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <TrendingUp className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Nicio prognoza generata</h3>
          <p className="text-muted-foreground">
            Apasa pe butonul de mai sus pentru a incepe.
          </p>
        </Card>
      )}
    </div>
  );
}
