import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { motion } from "framer-motion";
import { QrCodeIcon, LinkIcon } from "@heroicons/react/24/outline";

export default function JoinPage() {
  const pollUrl = `${window.location.origin}/poll`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="glass-panel border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <QrCodeIcon className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
              Join the Live Poll
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Scan the QR code below to participate.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-6 space-y-6">
            <div className="p-4 bg-white rounded-2xl shadow-xl">
              <QRCodeSVG
                value={pollUrl}
                size={220}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-black/20 px-4 py-2 rounded-full border border-white/5">
              <LinkIcon className="w-4 h-4" />
              <span>{pollUrl}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
