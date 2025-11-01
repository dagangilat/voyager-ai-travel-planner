import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, UserPlus, Users } from 'lucide-react';

export default function ShareTripDialog({ trip, isOpen, onOpenChange, onUpdateTrip }) {
  const [sharedWith, setSharedWith] = useState(trip?.shared_with || []);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('viewer');

  const handleAddUser = () => {
    const email = newUserEmail.trim().toLowerCase();
    
    if (!email) {
      alert('Please enter a user email.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }
    
    // Check if user is already in the list
    if (sharedWith.some(u => u.user_email === email) || trip.created_by === email) {
      alert('This user already has access.');
      return;
    }

    setSharedWith([...sharedWith, { user_email: email, role: newUserRole }]);
    setNewUserEmail('');
    setNewUserRole('viewer');
  };

  const handleRemoveUser = (email) => {
    setSharedWith(sharedWith.filter(u => u.user_email !== email));
  };

  const handleRoleChange = (email, role) => {
    setSharedWith(sharedWith.map(u => u.user_email === email ? { ...u, role } : u));
  };

  const handleSave = () => {
    onUpdateTrip(sharedWith);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Share "{trip.name}"</DialogTitle>
          <DialogDescription>
            Invite others to view or collaborate on this trip.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="user-email">User Email</Label>
              <Input
                id="user-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
                placeholder="user@example.com"
                className="border-gray-200"
              />
            </div>
            <div className="space-y-2">
               <Label htmlFor="user-role">Role</Label>
               <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger id="user-role" className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddUser} size="icon">
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4 pt-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Shared With
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <div className="flex-1">
                  <p className="font-medium text-sm">{trip.created_by}</p>
                  <p className="text-xs text-gray-500">Trip Owner</p>
                </div>
                <div className="text-sm font-medium text-gray-500 w-[110px] text-right pr-2">Owner</div>
              </div>
              {sharedWith.map(user => (
                <div key={user.user_email} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{user.user_email}</p>
                  </div>
                  <Select value={user.role} onValueChange={(role) => handleRoleChange(user.user_email, role)}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveUser(user.user_email)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}