import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export const ProfilePage: React.FC = () => {
  const { profile, user, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone })
        .eq("id", profile?.id);

      if (error) throw error;

      await refreshProfile?.();
      toast({ title: "Başarılı", description: "Profil güncellendi." });
    } catch (err: any) {
      toast({
        title: "Hata",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!password) return;
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Başarılı", description: "Şifre güncellendi." });
      setPassword("");
    } catch (err: any) {
      toast({
        title: "Hata",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Profilim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ad Soyad */}
          <div>
            <Label htmlFor="full_name">Ad Soyad</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          {/* Telefon */}
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              placeholder="Telefon numarası"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* E-posta */}
          <div>
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              value={profile?.email || user?.email || ""}
              readOnly
              className="bg-muted/50"
            />
          </div>

          {/* Rol */}
          <div>
            <Label htmlFor="role">Rol</Label>
            <Input
              id="role"
              value={profile?.role || ""}
              readOnly
              className="bg-muted/50"
            />
          </div>

          <Button onClick={handleUpdateProfile} disabled={loading} className="w-full">
            Profili Güncelle
          </Button>

          <hr className="my-4" />

          {/* Şifre Değiştir */}
          <div>
            <Label htmlFor="password">Yeni Şifre</Label>
            <Input
              type="password"
              id="password"
              placeholder="Yeni şifre girin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            onClick={handleChangePassword}
            disabled={!password || loading}
            className="w-full"
          >
            Şifreyi Güncelle
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
