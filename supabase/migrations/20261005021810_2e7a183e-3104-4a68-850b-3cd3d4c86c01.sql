DROP POLICY "Signed-in users can add skills" ON public.skills;

CREATE POLICY "Signed-in users can add valid skills"
ON public.skills
FOR INSERT
TO authenticated
WITH CHECK (length(btrim(name)) BETWEEN 1 AND 100);