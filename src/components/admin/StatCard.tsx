import React, { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  iconClassName?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  to?: string;
  bgColor?: string;
}

const StatCard = memo(function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
  className,
  iconClassName,
  valuePrefix,
  valueSuffix,
  to,
  bgColor,
}: StatCardProps) {
  const CardComponent = () => (
    <Card
      className={cn(
        "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-0 shadow-lg transform transition-all duration-300 hover:translate-y-[-4px] hover:shadow-2xl overflow-hidden cursor-pointer",
        className,
      )}
      style={{
        borderRadius: "16px",
        boxShadow:
          "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
        ...(bgColor && { background: bgColor }),
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-primary-tosca/20 to-primary-dark/20 dark:from-primary-tosca/30 dark:to-primary-dark/30">
        <CardTitle className="text-sm font-medium text-black dark:text-black">
          {title}
        </CardTitle>
        <div
          className={cn(
            "h-10 w-10 rounded-xl bg-gradient-to-br from-primary-tosca to-primary-dark flex items-center justify-center text-white backdrop-blur-sm",
            iconClassName,
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-4 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/90">
        <div className="text-3xl font-bold tracking-tight text-black">
          {valuePrefix}
          {value}
          {valueSuffix}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
      {trend && trendValue && (
        <CardFooter className="py-3 px-4 bg-gradient-to-r from-primary-tosca/10 to-primary-dark/10 dark:from-gray-900/50 dark:to-gray-800/50 border-t border-gray-100/50 dark:border-gray-800/50">
          <div
            className={`flex items-center text-xs font-medium ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-primary-tosca"}`}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
          </div>
        </CardFooter>
      )}
    </Card>
  );

  return to ? (
    <Link to={to} className="block no-underline">
      <CardComponent />
    </Link>
  ) : (
    <CardComponent />
  );
});

export default StatCard;
