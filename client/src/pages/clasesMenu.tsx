import { useMemo, useState } from "react";
import useClasses from "../hooks/useClasses";
import { Card, Row, Col, Input, Button, Space, Empty } from "antd";
import { CursosForm } from "../components/cursosForm";
import type { Clase } from "../interfaces/claseInterface";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

function parseISO(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

export function ClassMenu() {
  const { clases, addClases } = useClasses(); // ideal: que devuelva [] por defecto
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  // 1) Lista base segura
  const clasesSafe = useMemo<Clase[]>(
    () => (Array.isArray(clases) ? clases : []),
    [clases]
  );

  // 2) Filtrado derivado (sin useEffect)
  const filteredClases = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clasesSafe;
    return clasesSafe.filter((cl) =>
      (cl.name ?? "").toLowerCase().includes(term)
    );
  }, [clasesSafe, searchTerm]);

  // 3) Actuales / Pasados derivados
  const { cursosActuales, cursosPasados } = useMemo(() => {
    const now = new Date();
    const byEndDesc = (a: Clase, b: Clase) =>
      parseISO(b.dateEnd).getTime() - parseISO(a.dateEnd).getTime();

    const actuales = filteredClases
      .filter((cl) => parseISO(cl.dateEnd) >= now)
      .sort(byEndDesc);

    const pasados = filteredClases
      .filter((cl) => parseISO(cl.dateEnd) < now)
      .sort(byEndDesc);

    return { cursosActuales: actuales, cursosPasados: pasados };
  }, [filteredClases]);

  const handleAddClase = async (values: Omit<Clase, "id">) => {
    await addClases(values);
  };

  const goToStudents = (id: string) => navigate(`curso/${id}`);

  const renderGrid = (items: Clase[]) =>
    items.length ? (
      <Row gutter={[16, 16]}>
        {items.map((clase) => (
          <Col xs={24} sm={12} md={8} lg={6} key={clase.id}>
            <Card
              hoverable
              onClick={() => goToStudents(clase.id)}
              style={{
                width: "100%",
                height: 200,
                textAlign: "center",
                borderRadius: 20,
              }}
            >
              <h2>{clase.name}</h2>
              <p>Inicio: {dayjs(clase.dateBegin).format("DD/MM/YYYY")}</p>
              <p>Fin: {dayjs(clase.dateEnd).format("DD/MM/YYYY")}</p>
            </Card>
          </Col>
        ))}
      </Row>
    ) : (
      <Empty description="No hay cursos" />
    );

  return (
    <div
      className="w-full lg:max-w-6xl lg:mx-auto space-y-4 sm:space-y-6"
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 24px",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <img
          src="/src/assets/upb_logo.png"
          alt="UPB Logo"
          style={{ width: 350, height: "auto" }}
        />
      </div>
      <CursosForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddClase}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <Space>
          <Input
            placeholder="Buscar curso"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            style={{ width: 240 }}
          />
        </Space>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          Añadir
        </Button>
      </div>

      <h1>Cursos Actuales</h1>
      {renderGrid(cursosActuales)}

      <h1 style={{ marginTop: 24 }}>Cursos Pasados</h1>
      {renderGrid(cursosPasados)}
    </div>
  );
}
