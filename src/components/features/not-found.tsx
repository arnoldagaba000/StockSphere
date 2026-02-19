import { useRouter } from "@tanstack/react-router";
import { domAnimation, LazyMotion, m } from "framer-motion";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
    const router = useRouter();

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background px-6 text-foreground">
            <LazyMotion features={domAnimation}>
                <m.div
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg"
                    initial={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <Card className="rounded-2xl border bg-card shadow-xl">
                        <CardContent className="space-y-6 p-10 text-center">
                            <div className="flex justify-center">
                                <div className="rounded-full bg-muted p-4">
                                    <AlertTriangle className="h-10 w-10" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h1 className="font-bold text-4xl tracking-tight">
                                    404
                                </h1>
                                <h2 className="font-semibold text-xl">
                                    Page Not Found
                                </h2>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    The page you are looking for does not exist
                                    or may have been moved. Please check the URL
                                    or navigate using the options below.
                                </p>
                            </div>

                            <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
                                <Button
                                    className="rounded-2xl"
                                    onClick={() => router.history.back()}
                                    variant="outline"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Go Back
                                </Button>

                                <Button
                                    className="rounded-2xl"
                                    onClick={() =>
                                        router.navigate({
                                            to: "/",
                                            replace: true,
                                        })
                                    }
                                >
                                    <Home className="mr-2 h-4 w-4" />
                                    Home Page
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mt-8 text-center text-muted-foreground text-xs">
                        If you believe this is an error, please contact support.
                    </div>
                </m.div>
            </LazyMotion>
        </div>
    );
};

export default NotFound;
