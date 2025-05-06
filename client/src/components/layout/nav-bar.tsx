import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trophy, Menu, ChevronRight, LogOut, User, Settings, Home, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function NavBar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  return (
    <motion.header 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border-b border-border/40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm"
    >
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 text-xl font-bold cursor-pointer">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <Trophy className="h-6 w-6 text-primary" />
            </motion.div>
            <span className="bg-gradient-to-br from-primary to-primary/80 bg-clip-text text-transparent hidden sm:inline">
              Last Player Standing
            </span>
          </div>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <div className="w-full cursor-pointer flex items-center">
                      <Home className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/game-weeks">
                    <div className="w-full cursor-pointer flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Game Weeks</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                {user.isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Admin Controls
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <div className="w-full cursor-pointer flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Admin Panel</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/fixtures">
                        <div className="w-full cursor-pointer flex items-center">
                          <ChevronRight className="mr-2 h-4 w-4" />
                          <span>Fixtures</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/manage-fixtures">
                        <div className="w-full cursor-pointer flex items-center">
                          <ChevronRight className="mr-2 h-4 w-4" />
                          <span>Manage Fixtures</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <nav className="hidden md:block">
              <ul className="flex items-center gap-6">
                <li>
                  <Link href="/">
                    <motion.div
                      whileHover={{ y: -2 }}
                      className={cn(
                        "text-sm font-medium transition-colors flex items-center gap-1 px-3 py-2 rounded-md",
                        location === "/" 
                          ? "text-primary bg-primary/10" 
                          : "text-muted-foreground hover:text-primary"
                      )}
                    >
                      <Home className="h-4 w-4 mr-1" />
                      Dashboard
                    </motion.div>
                  </Link>
                </li>
                <li>
                  <Link href="/game-weeks">
                    <motion.div
                      whileHover={{ y: -2 }}
                      className={cn(
                        "text-sm font-medium transition-colors flex items-center gap-1 px-3 py-2 rounded-md",
                        location === "/game-weeks" 
                          ? "text-primary bg-primary/10" 
                          : "text-muted-foreground hover:text-primary"
                      )}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Game Weeks
                    </motion.div>
                  </Link>
                </li>
                {user.isAdmin && (
                  <>
                    <li>
                      <Link href="/admin">
                        <motion.div
                          whileHover={{ y: -2 }}
                          className={cn(
                            "text-sm font-medium transition-colors flex items-center gap-1 px-3 py-2 rounded-md",
                            location === "/admin" 
                              ? "text-primary bg-primary/10" 
                              : "text-muted-foreground hover:text-primary"
                          )}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Admin
                        </motion.div>
                      </Link>
                    </li>
                    <li>
                      <Link href="/admin/fixtures">
                        <motion.div
                          whileHover={{ y: -2 }}
                          className={cn(
                            "text-sm font-medium transition-colors flex items-center gap-1 px-3 py-2 rounded-md",
                            location === "/admin/fixtures" 
                              ? "text-primary bg-primary/10" 
                              : "text-muted-foreground hover:text-primary"
                          )}
                        >
                          Fixtures
                        </motion.div>
                      </Link>
                    </li>
                    <li>
                      <Link href="/admin/manage-fixtures">
                        <motion.div
                          whileHover={{ y: -2 }}
                          className={cn(
                            "text-sm font-medium transition-colors flex items-center gap-1 px-3 py-2 rounded-md",
                            location === "/admin/manage-fixtures" 
                              ? "text-primary bg-primary/10" 
                              : "text-muted-foreground hover:text-primary"
                          )}
                        >
                          Manage Fixtures
                        </motion.div>
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-10 w-10 rounded-full overflow-hidden border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <motion.span 
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer flex items-center"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="mr-2 h-4 w-4 text-destructive" />
                  <span className="text-destructive">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </motion.header>
  );
}