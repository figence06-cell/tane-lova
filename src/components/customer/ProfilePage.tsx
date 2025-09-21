import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const ProfilePage: React.FC = () => {
  const { profile } = useAuth();

  return (
    <DashboardLayout>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Profilim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="full_name">Ad Soyad</Label>
            <Input
              id="full_name"
              value={profile?.full_name || ""}
              readOnly
              className="bg-muted/50"
            />
          </div>
          <div>
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              value={profile?.email || ""}
              readOnly
              className="bg-muted/50"
            />
          </div>
          <div>
            <Label htmlFor="role">Rol</Label>
            <Input
              id="role"
              value={profile?.role || ""}
              readOnly
              className="bg-muted/50"
            />
          </div>
          {/* İleride güncelleme formu eklenebilir */}
          <Button disabled className="w-full">
            Güncelle (yakında)
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default ProfilePage;
