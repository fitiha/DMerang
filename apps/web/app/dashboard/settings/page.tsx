"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Globe, Clock, Save, Loader2 } from "lucide-react";
import { TIMEZONES, get12HourOptions, getTimezoneDisplay } from "@/lib/timezones";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    defaultTimezone: "UTC",
    defaultDailyLimit: 50,
    defaultMinDelay: 30,
    defaultMaxDelay: 120,
    defaultWorkingHoursStart: 9,
    defaultWorkingHoursEnd: 17,
  });

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate save - in production, this would call an API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    localStorage.setItem("insta-auto-settings", JSON.stringify(settings));
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your default automation preferences
        </p>
      </div>

      {/* Default Timezone */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Timezone
          </CardTitle>
          <CardDescription>
            Set your default timezone for campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={settings.defaultTimezone}
            onValueChange={(value) =>
              setSettings({ ...settings, defaultTimezone: value })
            }
          >
            <SelectTrigger className="w-full md:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Default Rate Limits
          </CardTitle>
          <CardDescription>
            Set default limits for new campaigns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Daily Message Limit</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={settings.defaultDailyLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultDailyLimit: parseInt(e.target.value) || 50,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Delay Between Messages (seconds)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={10}
                  max={600}
                  value={settings.defaultMinDelay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultMinDelay: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-24"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="number"
                  min={30}
                  max={1800}
                  value={settings.defaultMaxDelay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultMaxDelay: parseInt(e.target.value) || 120,
                    })
                  }
                  className="w-24"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default Working Hours</Label>
            <div className="flex items-center gap-2">
              <Select
                value={settings.defaultWorkingHoursStart.toString()}
                onValueChange={(value) =>
                  setSettings({ ...settings, defaultWorkingHoursStart: parseInt(value) })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {get12HourOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">to</span>
              <Select
                value={settings.defaultWorkingHoursEnd.toString()}
                onValueChange={(value) =>
                  setSettings({ ...settings, defaultWorkingHoursEnd: parseInt(value) })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {get12HourOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </>
        )}
      </Button>
    </div>
  );
}
